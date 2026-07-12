import secrets
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Category as CategoryModel,
    DirectoryEntry as DirectoryEntryModel,
    Project as ProjectModel,
)
from app.schemas import (
    CategorySlug,
    Coordinates,
    DirectoryEntryStatus,
    LinkedDirectoryEntry,
    Project,
    ProjectCreate,
    ProjectPublicUpdate,
    ProjectStage,
    ProjectUpdate,
    SocialLinks,
    StructuredLocation,
)
from app.services.directory_service import resolve_categories, slugify_category
from app.services.storage import gcs_storage, hosted_image_url_prefix, is_hosted_image_url


def _parse_user_ids(raw: list | None) -> list[UUID]:
    if not raw:
        return []
    return [UUID(str(item)) for item in raw]


def project_to_schema(project: ProjectModel) -> Project:
    coordinates = None
    if project.latitude is not None and project.longitude is not None:
        coordinates = Coordinates(latitude=project.latitude, longitude=project.longitude)

    location = StructuredLocation(**project.location) if project.location else None
    social = SocialLinks(**project.social_links) if project.social_links else None
    categories = [CategorySlug(c.slug) for c in project.categories]
    directory_entries = [
        LinkedDirectoryEntry.model_validate(entry) for entry in project.directory_entries
    ]

    return Project(
        id=project.id,
        name=project.name,
        description=project.description,
        image_url=project.image_url,
        image_is_external=bool(project.image_url) and not is_hosted_image_url(project.image_url),
        location=location,
        coordinates=coordinates,
        social_links=social,
        categories=categories,
        suggested_category=project.suggested_category,
        stage=ProjectStage(project.stage) if project.stage else None,
        featured=project.featured,
        status=DirectoryEntryStatus(project.status),
        user_ids=_parse_user_ids(project.user_ids),
        directory_entries=directory_entries,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


def get_project(db: Session, project_id: UUID) -> ProjectModel | None:
    return (
        db.query(ProjectModel)
        .options(
            selectinload(ProjectModel.categories),
            selectinload(ProjectModel.directory_entries),
        )
        .filter(ProjectModel.id == project_id)
        .first()
    )


def _filter_needs_photo(q):
    no_image = ProjectModel.image_url.is_(None)
    prefix = hosted_image_url_prefix()
    if prefix:
        external_image = ~ProjectModel.image_url.like(f"{prefix}%")
        return q.filter(no_image | external_image)
    return q.filter(no_image)


def list_projects(
    db: Session,
    *,
    limit: int = 50,
    offset: int = 0,
    category_slug: CategorySlug | None = None,
    status: DirectoryEntryStatus | None = None,
    stage: ProjectStage | None = None,
    needs_photo: bool = False,
) -> list[ProjectModel]:
    q = db.query(ProjectModel).options(
        selectinload(ProjectModel.categories), selectinload(ProjectModel.directory_entries)
    )
    if category_slug:
        q = q.join(ProjectModel.categories).filter(CategoryModel.slug == category_slug)
    if status:
        q = q.filter(ProjectModel.status == status.value)
    if stage:
        q = q.filter(ProjectModel.stage == stage.value)
    if needs_photo:
        q = _filter_needs_photo(q)
    return q.order_by(ProjectModel.name).offset(offset).limit(limit).all()


def count_projects(
    db: Session,
    category_slug: CategorySlug | None = None,
    status: DirectoryEntryStatus | None = None,
    stage: ProjectStage | None = None,
) -> int:
    q = db.query(ProjectModel)
    if category_slug:
        q = q.join(ProjectModel.categories).filter(CategoryModel.slug == category_slug)
    if status:
        q = q.filter(ProjectModel.status == status.value)
    if stage:
        q = q.filter(ProjectModel.stage == stage.value)
    return q.count()


def _serialize_user_ids(user_ids: list[UUID]) -> list[str] | None:
    if not user_ids:
        return None
    return [str(uid) for uid in user_ids]


def apply_create_data(project: ProjectModel, body: ProjectCreate) -> None:
    project.name = body.name[:255]
    project.description = body.description
    project.image_url = body.image_url
    project.location = body.location.model_dump(exclude_none=True) if body.location else None
    project.social_links = (
        body.social_links.model_dump(exclude_none=True) if body.social_links else None
    )
    project.suggested_category = (
        body.suggested_category.strip()[:255] if body.suggested_category else None
    )
    project.stage = body.stage.value if body.stage else None
    project.featured = body.featured
    project.status = body.status.value
    project.user_ids = _serialize_user_ids(body.user_ids)


def stamp_creator(project: ProjectModel, user_id: UUID | None) -> None:
    """Adds a signed-in creator's local user id to user_ids, alongside the anonymous
    edit_token flow. No-op if signed out — anonymous creation is unaffected."""
    if user_id is None:
        return
    ids = _parse_user_ids(project.user_ids)
    if user_id not in ids:
        ids.append(user_id)
    project.user_ids = _serialize_user_ids(ids)


def get_or_create_edit_token(db: Session, project: ProjectModel) -> str:
    if not project.edit_token:
        project.edit_token = secrets.token_urlsafe(24)
        db.commit()
    return project.edit_token


def apply_update_data(project: ProjectModel, body: ProjectUpdate | ProjectPublicUpdate) -> None:
    fields = body.model_fields_set
    if "name" in fields and body.name is not None:
        project.name = body.name[:255]
    if "description" in fields:
        project.description = body.description
    if "image_url" in fields:
        project.image_url = body.image_url
    if "location" in fields:
        project.location = body.location.model_dump(exclude_none=True) if body.location else None
    if "social_links" in fields:
        project.social_links = (
            body.social_links.model_dump(exclude_none=True) if body.social_links else None
        )
    if "suggested_category" in fields:
        project.suggested_category = (
            body.suggested_category.strip()[:255] if body.suggested_category else None
        )
    if "stage" in fields:
        project.stage = body.stage.value if body.stage else None
    if "featured" in fields and body.featured is not None:
        project.featured = body.featured
    if "status" in fields and body.status is not None:
        project.status = body.status.value
    if "user_ids" in fields and body.user_ids is not None:
        project.user_ids = _serialize_user_ids(body.user_ids)


def set_project_categories(db: Session, project: ProjectModel, slugs: list[CategorySlug]) -> None:
    project.categories = resolve_categories(db, slugs)


def set_project_directory_links(db: Session, project: ProjectModel, entry_ids: list[UUID]) -> None:
    if not entry_ids:
        project.directory_entries = []
        return
    entries = db.query(DirectoryEntryModel).filter(DirectoryEntryModel.id.in_(entry_ids)).all()
    found = {e.id for e in entries}
    missing = set(entry_ids) - found
    if missing:
        raise ValueError(f"Unknown directory entries: {', '.join(str(m) for m in missing)}")
    project.directory_entries = entries


def find_existing_project(db: Session, name: str) -> ProjectModel | None:
    name_lower = name.strip().lower()
    return (
        db.query(ProjectModel)
        .filter(func.lower(ProjectModel.name) == name_lower)
        .order_by(ProjectModel.created_at.asc())
        .first()
    )


def approve_suggested_category(db: Session, project: ProjectModel) -> ProjectModel:
    """Create a category from the project's suggested_category, assign it, and clear the field."""
    if not project.suggested_category:
        raise ValueError("Project has no suggested category")

    name = project.suggested_category.strip()
    slug = slugify_category(name)
    if not slug:
        raise ValueError("Suggested category name produces an invalid slug")

    category = db.query(CategoryModel).filter(CategoryModel.slug == slug).first()
    if not category:
        category = CategoryModel(slug=slug, name=name)
        db.add(category)
        db.flush()

    if category not in project.categories:
        project.categories.append(category)

    project.suggested_category = None
    db.commit()
    db.refresh(project)
    refreshed = get_project(db, project.id)
    assert refreshed is not None
    return refreshed


def find_orphaned_images(db: Session) -> list:
    """GCS-hosted project photos no project's image_url points to anymore.

    Projects can link to a directory entry and inherit its image_url, so a blob under
    projects/ is still "referenced" if any DirectoryEntry points to it too — not just Project.
    """
    if not gcs_storage:
        return []
    referenced = {
        url
        for (url,) in db.query(ProjectModel.image_url).filter(ProjectModel.image_url.isnot(None))
    }
    referenced |= {
        url
        for (url,) in db.query(DirectoryEntryModel.image_url).filter(
            DirectoryEntryModel.image_url.isnot(None)
        )
    }
    return [b for b in gcs_storage.list_project_photos() if b.public_url not in referenced]
