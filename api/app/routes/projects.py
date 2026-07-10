import io
import mimetypes
import secrets
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Project as ProjectModel, User as UserModel
from app.schemas import (
    CategorySlug,
    DirectoryExtractRequest,
    DirectoryExtractResponse,
    DirectoryPhotoFromUrlRequest,
    DirectoryPhotoUploadResponse,
    DirectoryEntryStatus,
    Project,
    ProjectCreate,
    ProjectEditLink,
    ProjectMember,
    ProjectMemberJoin,
    ProjectMemberUpdate,
    ProjectPublicUpdate,
    ProjectStage,
    ProjectUpdate,
)
from app.services.auth import get_current_user, get_current_user_optional
from app.services.geocoding import geocode_location
from app.services.project_member_service import (
    get_member,
    join_project,
    leave_project,
    list_members,
    member_to_schema,
    update_shared_fields,
)
from app.services.project_service import (
    apply_create_data,
    apply_update_data,
    approve_suggested_category,
    get_or_create_edit_token,
    get_project,
    list_projects,
    project_to_schema,
    set_project_categories,
    set_project_directory_links,
    stamp_creator,
)
from app.services.scraping import extract_from_url
from app.services.storage import ALLOWED_CONTENT_TYPES, gcs_storage

router = APIRouter(prefix="/projects", tags=["projects"])

MAX_PHOTO_BYTES = 10 * 1024 * 1024


@router.post(
    "/photos", response_model=DirectoryPhotoUploadResponse, status_code=status.HTTP_201_CREATED
)
async def upload_project_photo(file: UploadFile = File(...)):
    if not gcs_storage:
        raise HTTPException(status_code=500, detail="Cloud storage is not configured")
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    is_valid, error_msg = gcs_storage.validate_image_file(file.filename)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content type. Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}",
        )

    try:
        url = gcs_storage.upload_project_photo(file.file, file.filename, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {e}")
    return DirectoryPhotoUploadResponse(url=url)


@router.post(
    "/photos/from-url",
    response_model=DirectoryPhotoUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def fetch_and_upload_project_photo(body: DirectoryPhotoFromUrlRequest):
    """Fetch an image from an external URL (e.g. a scraped og:image) and re-host it in our
    own bucket, since externally-hosted photo URLs are prone to breaking or disappearing."""
    if not gcs_storage:
        raise HTTPException(status_code=500, detail="Cloud storage is not configured")
    if not (body.url.startswith("http://") or body.url.startswith("https://")):
        raise HTTPException(status_code=400, detail="url must start with http:// or https://")

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(
                body.url, headers={"User-Agent": "Mozilla/5.0 (compatible; DOGSBot/1.0)"}
            )
            response.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch image: {e}")

    content_type = response.headers.get("content-type", "").split(";")[0].strip()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"URL did not return a supported image type (got {content_type or 'unknown'})",
        )
    if len(response.content) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=400, detail="Image is too large (max 10MB)")

    ext = mimetypes.guess_extension(content_type) or ".jpg"
    try:
        url = gcs_storage.upload_project_photo(
            io.BytesIO(response.content), f"image{ext}", content_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {e}")
    return DirectoryPhotoUploadResponse(url=url)


@router.get("", response_model=list[Project])
async def list_projects_endpoint(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    category: CategorySlug | None = Query(None),
    status: DirectoryEntryStatus | None = Query(None),
    stage: ProjectStage | None = Query(None),
    needs_photo: bool = Query(False),
    db: Session = Depends(get_db),
):
    projects = list_projects(
        db,
        limit=limit,
        offset=offset,
        category_slug=category,
        status=status,
        stage=stage,
        needs_photo=needs_photo,
    )
    return [project_to_schema(p) for p in projects]


@router.post("/extract", response_model=DirectoryExtractResponse)
async def extract_project(body: DirectoryExtractRequest):
    if not (body.url.startswith("http://") or body.url.startswith("https://")):
        raise HTTPException(status_code=400, detail="url must start with http:// or https://")
    return await extract_from_url(body.url)


@router.get("/{project_id}", response_model=Project)
def get_project_endpoint(project_id: UUID, db: Session = Depends(get_db)):
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project_to_schema(project)


@router.get("/{project_id}/edit-link", response_model=ProjectEditLink)
def get_project_edit_link(project_id: UUID, db: Session = Depends(get_db)):
    """Returns the secret token for a self-service edit link. Not linked from any public
    page; only meant to be called from admin/review tooling to hand out to a project's owner."""
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectEditLink(token=get_or_create_edit_token(db, project))


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: UserModel | None = Depends(get_current_user_optional),
):
    """Auth is optional here: a valid `Authorization: Bearer <idToken>` stamps the signed-in
    user's id into `user_ids`; an anonymous request works exactly as before, falling back to the
    `edit_token` flow. An invalid/expired token is treated the same as no token — never a 401."""
    project = ProjectModel()
    apply_create_data(project, body)
    stamp_creator(project, current_user.id if current_user else None)
    db.add(project)
    db.flush()
    get_or_create_edit_token(db, project)

    if body.categories:
        set_project_categories(db, project, body.categories)

    try:
        set_project_directory_links(db, project, body.directory_entry_ids)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if body.location:
        coords = await geocode_location(project.location)
        if coords:
            project.latitude, project.longitude = coords

    db.commit()
    db.refresh(project)
    project = get_project(db, project.id)
    assert project is not None
    return project_to_schema(project)


@router.patch("/{project_id}", response_model=Project)
async def update_project(
    project_id: UUID,
    body: ProjectUpdate,
    db: Session = Depends(get_db),
):
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    location_before = dict(project.location) if project.location else None
    apply_update_data(project, body)

    if body.categories is not None:
        set_project_categories(db, project, body.categories)

    if body.directory_entry_ids is not None:
        try:
            set_project_directory_links(db, project, body.directory_entry_ids)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    location_changed = body.location is not None and (
        body.location.model_dump(exclude_none=True) != location_before
    )
    if location_changed or (project.latitude is None and project.location):
        coords = await geocode_location(project.location)
        if coords:
            project.latitude, project.longitude = coords

    db.commit()
    db.refresh(project)
    project = get_project(db, project.id)
    assert project is not None
    return project_to_schema(project)


@router.patch("/{project_id}/public", response_model=Project)
async def update_project_public(
    project_id: UUID,
    body: ProjectPublicUpdate,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """Self-service update for a project's owner, gated by the secret edit-link token
    (handed out via GET /{project_id}/edit-link). Only allows a safe subset of fields —
    status, featured, and user_ids stay admin-only."""
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if not project.edit_token or not secrets.compare_digest(project.edit_token, token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or missing edit link"
        )

    location_before = dict(project.location) if project.location else None
    apply_update_data(project, body)

    if body.categories is not None:
        set_project_categories(db, project, body.categories)

    if body.directory_entry_ids is not None:
        try:
            set_project_directory_links(db, project, body.directory_entry_ids)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    location_changed = body.location is not None and (
        body.location.model_dump(exclude_none=True) != location_before
    )
    if location_changed or (project.latitude is None and project.location):
        coords = await geocode_location(project.location)
        if coords:
            project.latitude, project.longitude = coords

    db.commit()
    db.refresh(project)
    project = get_project(db, project.id)
    assert project is not None
    return project_to_schema(project)


@router.post("/{project_id}/approve-suggested-category", response_model=Project)
def approve_suggested_category_endpoint(project_id: UUID, db: Session = Depends(get_db)):
    """Create a category from the project's suggested_category, assign it, and clear the field."""
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    try:
        project = approve_suggested_category(db, project)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return project_to_schema(project)


@router.get("/{project_id}/members", response_model=list[ProjectMember])
def list_project_members(
    project_id: UUID,
    db: Session = Depends(get_db),
    _current_user: UserModel = Depends(get_current_user),
):
    """Signed-in only: the roster includes member contact info, which the plan scopes to
    other signed-in users rather than the general public."""
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return [member_to_schema(m, project.originator_user_id) for m in list_members(db, project_id)]


@router.post(
    "/{project_id}/join", response_model=ProjectMember, status_code=status.HTTP_201_CREATED
)
def join_project_endpoint(
    project_id: UUID,
    body: ProjectMemberJoin,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Signed-in only: the first hard-auth-required action in the app, since joining a
    project's roster needs a real identity to attach, unlike anonymous submissions."""
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    try:
        member = join_project(db, project_id, current_user.id, body)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    return member_to_schema(member, project.originator_user_id)


@router.delete("/{project_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_project_endpoint(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    try:
        leave_project(db, project_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.patch("/{project_id}/members/me", response_model=ProjectMember)
def update_own_membership(
    project_id: UUID,
    body: ProjectMemberUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    member = get_member(db, project_id, current_user.id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Not a member of this project"
        )
    member = update_shared_fields(db, member, body)
    return member_to_schema(member, project.originator_user_id)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: UUID, db: Session = Depends(get_db)):
    project = get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    db.delete(project)
    db.commit()
