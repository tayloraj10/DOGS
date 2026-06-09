from uuid import UUID

from dogs_schemas import (
    CategorySlug,
    Coordinates,
    DirectoryEntry,
    DirectoryEntryCreate,
    DirectoryEntryUpdate,
    SocialLinks,
    StructuredLocation,
)
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.models import Category, DirectoryEntry as DirectoryEntryModel


def _parse_user_ids(raw: list | None) -> list[UUID]:
    if not raw:
        return []
    return [UUID(str(item)) for item in raw]


def entry_to_schema(entry: DirectoryEntryModel) -> DirectoryEntry:
    coordinates = None
    if entry.latitude is not None and entry.longitude is not None:
        coordinates = Coordinates(latitude=entry.latitude, longitude=entry.longitude)

    location = StructuredLocation(**entry.location) if entry.location else None
    social = SocialLinks(**entry.social_links) if entry.social_links else None
    categories = [CategorySlug(c.slug) for c in entry.categories]

    return DirectoryEntry(
        id=entry.id,
        name=entry.name,
        description=entry.description,
        image_url=entry.image_url,
        location=location,
        coordinates=coordinates,
        social_links=social,
        categories=categories,
        featured=entry.featured,
        user_ids=_parse_user_ids(entry.user_ids),
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


def get_entry(db: Session, entry_id: UUID) -> DirectoryEntryModel | None:
    return (
        db.query(DirectoryEntryModel)
        .options(selectinload(DirectoryEntryModel.categories))
        .filter(DirectoryEntryModel.id == entry_id)
        .first()
    )


def list_entries(
    db: Session,
    *,
    limit: int = 50,
    offset: int = 0,
    category_slug: CategorySlug | None = None,
) -> list[DirectoryEntryModel]:
    q = db.query(DirectoryEntryModel).options(selectinload(DirectoryEntryModel.categories))
    if category_slug:
        q = q.join(DirectoryEntryModel.categories).filter(Category.slug == category_slug.value)
    return q.order_by(DirectoryEntryModel.name).offset(offset).limit(limit).all()


def count_entries(db: Session, category_slug: CategorySlug | None = None) -> int:
    q = db.query(DirectoryEntryModel)
    if category_slug:
        q = q.join(DirectoryEntryModel.categories).filter(Category.slug == category_slug.value)
    return q.count()


def resolve_categories(db: Session, slugs: list[CategorySlug]) -> list[Category]:
    if not slugs:
        return []
    slug_values = [s.value for s in slugs]
    categories = db.query(Category).filter(Category.slug.in_(slug_values)).all()
    found = {c.slug for c in categories}
    missing = set(slug_values) - found
    if missing:
        raise ValueError(f"Unknown categories: {', '.join(sorted(missing))}")
    return categories


def _serialize_user_ids(user_ids: list[UUID]) -> list[str] | None:
    if not user_ids:
        return None
    return [str(uid) for uid in user_ids]


def apply_create_data(entry: DirectoryEntryModel, body: DirectoryEntryCreate) -> None:
    entry.name = body.name[:255]
    entry.description = body.description
    entry.image_url = body.image_url
    entry.location = body.location.model_dump(exclude_none=True) if body.location else None
    entry.social_links = (
        body.social_links.model_dump(exclude_none=True) if body.social_links else None
    )
    entry.featured = body.featured
    entry.user_ids = _serialize_user_ids(body.user_ids)


def apply_update_data(entry: DirectoryEntryModel, body: DirectoryEntryUpdate) -> None:
    data = body.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        entry.name = data["name"][:255]
    if "description" in data:
        entry.description = data["description"]
    if "image_url" in data:
        entry.image_url = data["image_url"]
    if "location" in data:
        loc = data["location"]
        entry.location = loc.model_dump(exclude_none=True) if loc else None
    if "social_links" in data:
        links = data["social_links"]
        entry.social_links = links.model_dump(exclude_none=True) if links else None
    if "featured" in data and data["featured"] is not None:
        entry.featured = data["featured"]
    if "user_ids" in data and data["user_ids"] is not None:
        entry.user_ids = _serialize_user_ids(data["user_ids"])


def set_entry_categories(db: Session, entry: DirectoryEntryModel, slugs: list[CategorySlug]) -> None:
    entry.categories = resolve_categories(db, slugs)


def find_existing_entry(
    db: Session, name: str, instagram: str | None
) -> DirectoryEntryModel | None:
    if instagram:
        ig_lower = instagram.lower()
        hit = (
            db.query(DirectoryEntryModel)
            .filter(DirectoryEntryModel.social_links.isnot(None))
            .filter(
                func.lower(DirectoryEntryModel.social_links["instagram"].as_string()) == ig_lower
            )
            .first()
        )
        if hit:
            return hit

    name_lower = name.strip().lower()
    return (
        db.query(DirectoryEntryModel)
        .filter(func.lower(DirectoryEntryModel.name) == name_lower)
        .order_by(DirectoryEntryModel.created_at.asc())
        .first()
    )
