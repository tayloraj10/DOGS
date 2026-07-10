import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    IdeaSimilarApp as IdeaSimilarAppModel,
    ProjectIdea as ProjectIdeaModel,
    User as UserModel,
)
from app.schemas import (
    CategorySlug,
    IdeaInterestCreate,
    Project,
    ProjectIdea,
    ProjectIdeaCreate,
    ProjectIdeaEditLink,
    ProjectIdeaPublicUpdate,
    ProjectIdeaStatus,
    ProjectIdeaUpdate,
    SimilarApp,
    SimilarAppCreate,
    SimilarMatch,
)
from app.services.auth import get_current_user, get_current_user_optional, require_admin
from app.services.rate_limit import rate_limit_idea_creation
from app.services.project_idea_service import (
    add_similar_app,
    apply_create_data,
    apply_update_data,
    approve_idea,
    convert_idea,
    express_interest,
    get_idea,
    get_or_create_edit_token,
    idea_to_schema,
    list_ideas,
    merge_idea,
    reject_idea,
    search_similar,
    set_idea_categories,
    stamp_submitter,
    withdraw_interest,
)
from app.services.project_service import project_to_schema

router = APIRouter(prefix="/project-ideas", tags=["project-ideas"])


@router.get("/similar", response_model=list[SimilarMatch])
def search_similar_endpoint(
    name: str = Query(...),
    description: str = Query(""),
    limit: int = Query(5, ge=1, le=20),
    exclude_idea_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    """Trigram dedup search used by the submission form: as a visitor types their idea,
    the frontend calls this to warn them about existing ideas/projects before they submit."""
    return search_similar(
        db, name=name, description=description, limit=limit, exclude_idea_id=exclude_idea_id
    )


@router.get("", response_model=list[ProjectIdea])
def list_ideas_endpoint(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    category: CategorySlug | None = Query(None),
    status: ProjectIdeaStatus | None = Query(None),
    db: Session = Depends(get_db),
):
    ideas = list_ideas(db, limit=limit, offset=offset, category_slug=category, status=status)
    return [idea_to_schema(i) for i in ideas]


@router.get("/{idea_id}", response_model=ProjectIdea)
def get_idea_endpoint(idea_id: UUID, db: Session = Depends(get_db)):
    idea = get_idea(db, idea_id)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    return idea_to_schema(idea)


@router.get("/{idea_id}/edit-link", response_model=ProjectIdeaEditLink)
def get_idea_edit_link(idea_id: UUID, db: Session = Depends(get_db)):
    """Returns the secret token for a self-service edit link, same pattern as projects —
    not linked from any public page, handed out to the submitter after they create the idea."""
    idea = get_idea(db, idea_id)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    return ProjectIdeaEditLink(token=get_or_create_edit_token(db, idea))


@router.post(
    "",
    response_model=ProjectIdea,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_idea_creation)],
)
def create_idea(
    body: ProjectIdeaCreate,
    db: Session = Depends(get_db),
    current_user: UserModel | None = Depends(get_current_user_optional),
):
    """Auth is optional: a valid bearer token stamps the signed-in user as submitter; an
    anonymous request falls back to the edit_token flow, same as project/directory creation."""
    idea = ProjectIdeaModel()
    apply_create_data(idea, body)
    stamp_submitter(idea, current_user.id if current_user else None)
    db.add(idea)
    db.flush()
    get_or_create_edit_token(db, idea)

    if body.categories:
        set_idea_categories(db, idea, body.categories)

    db.commit()
    db.refresh(idea)
    idea = get_idea(db, idea.id)
    assert idea is not None
    return idea_to_schema(idea)


@router.patch("/{idea_id}", response_model=ProjectIdea)
def update_idea(
    idea_id: UUID,
    body: ProjectIdeaUpdate,
    db: Session = Depends(get_db),
    _admin: UserModel = Depends(require_admin),
):
    """Admin-only: the only update route allowed to touch status directly."""
    idea = get_idea(db, idea_id)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")

    apply_update_data(idea, body)
    if body.categories is not None:
        set_idea_categories(db, idea, body.categories)

    db.commit()
    db.refresh(idea)
    idea = get_idea(db, idea.id)
    assert idea is not None
    return idea_to_schema(idea)


@router.patch("/{idea_id}/public", response_model=ProjectIdea)
def update_idea_public(
    idea_id: UUID,
    body: ProjectIdeaPublicUpdate,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """Self-service update for the submitter, gated by the secret edit-link token. Excludes
    status and merged_into_project_id, which stay admin-only."""
    idea = get_idea(db, idea_id)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    if not idea.edit_token or not secrets.compare_digest(idea.edit_token, token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or missing edit link"
        )

    apply_update_data(idea, body)
    if body.categories is not None:
        set_idea_categories(db, idea, body.categories)

    db.commit()
    db.refresh(idea)
    idea = get_idea(db, idea.id)
    assert idea is not None
    return idea_to_schema(idea)


@router.patch("/{idea_id}/mine", response_model=ProjectIdea)
def update_idea_mine(
    idea_id: UUID,
    body: ProjectIdeaPublicUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Self-service update for the signed-in submitter — same restricted fields as the
    token-gated /public flow, but keyed off account ownership instead of a saved link."""
    idea = get_idea(db, idea_id)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    if idea.submitter_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only the submitter can edit this idea"
        )

    apply_update_data(idea, body)
    if body.categories is not None:
        set_idea_categories(db, idea, body.categories)

    db.commit()
    db.refresh(idea)
    idea = get_idea(db, idea.id)
    assert idea is not None
    return idea_to_schema(idea)


@router.post(
    "/{idea_id}/similar-apps", response_model=SimilarApp, status_code=status.HTTP_201_CREATED
)
def add_similar_app_endpoint(
    idea_id: UUID,
    body: SimilarAppCreate,
    db: Session = Depends(get_db),
    current_user: UserModel | None = Depends(get_current_user_optional),
):
    """Crowdsourced prior-art link: anyone (not just the original submitter) can point out
    an existing app/site already doing something similar to this idea."""
    idea = get_idea(db, idea_id)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    app = add_similar_app(db, idea, body, current_user.id if current_user else None)
    return SimilarApp.model_validate(app)


@router.delete("/{idea_id}/similar-apps/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_similar_app(idea_id: UUID, app_id: UUID, db: Session = Depends(get_db)):
    app = (
        db.query(IdeaSimilarAppModel)
        .filter(IdeaSimilarAppModel.id == app_id, IdeaSimilarAppModel.idea_id == idea_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Similar app not found")
    db.delete(app)
    db.commit()


@router.post("/{idea_id}/approve", response_model=ProjectIdea)
def approve_idea_endpoint(
    idea_id: UUID,
    db: Session = Depends(get_db),
    _admin: UserModel = Depends(require_admin),
):
    """Marks a pending idea as vetted so builders can express interest in it. Does not
    create a project — see /convert for that."""
    idea = get_idea(db, idea_id)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    try:
        idea = approve_idea(db, idea)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    return idea_to_schema(idea)


@router.post("/{idea_id}/interest", response_model=ProjectIdea)
def express_interest_endpoint(
    idea_id: UUID,
    body: IdeaInterestCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Self-service: any signed-in user can mark themselves interested in an approved
    idea. Not exclusive — any number of people can be interested at once."""
    idea = get_idea(db, idea_id)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    try:
        idea = express_interest(db, idea, current_user.id, body)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    return idea_to_schema(idea)


@router.delete("/{idea_id}/interest", response_model=ProjectIdea)
def withdraw_interest_endpoint(
    idea_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Lets an interested user back out."""
    idea = get_idea(db, idea_id)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    try:
        idea = withdraw_interest(db, idea, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    return idea_to_schema(idea)


@router.post("/{idea_id}/convert", response_model=Project)
def convert_idea_endpoint(
    idea_id: UUID,
    db: Session = Depends(get_db),
    _admin: UserModel = Depends(require_admin),
):
    """Promotes a claimed idea into a live Project, seating everyone who expressed
    interest as members. Admin action, reserved for once a team is confirmed to be
    actively building it."""
    idea = get_idea(db, idea_id)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    try:
        project = convert_idea(db, idea)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    return project_to_schema(project)


@router.post("/{idea_id}/reject", response_model=ProjectIdea)
def reject_idea_endpoint(
    idea_id: UUID,
    db: Session = Depends(get_db),
    _admin: UserModel = Depends(require_admin),
):
    idea = get_idea(db, idea_id)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    try:
        idea = reject_idea(db, idea)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    return idea_to_schema(idea)


@router.post("/{idea_id}/merge", response_model=ProjectIdea)
def merge_idea_endpoint(
    idea_id: UUID,
    project_id: UUID = Query(...),
    db: Session = Depends(get_db),
    _admin: UserModel = Depends(require_admin),
):
    """Resolves an idea as a duplicate of an existing project rather than spawning a new one."""
    idea = get_idea(db, idea_id)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    try:
        idea = merge_idea(db, idea, project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    return idea_to_schema(idea)
