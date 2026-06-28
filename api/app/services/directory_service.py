import re
import secrets
from uuid import UUID

from app.schemas import (
    CategorySlug,
    Coordinates,
    DirectoryEntry,
    DirectoryEntryCreate,
    DirectoryEntryPublicUpdate,
    DirectoryEntryStatus,
    DirectoryEntryUpdate,
    SocialLinks,
    StructuredLocation,
)
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.models import Category as CategoryModel, DirectoryEntry as DirectoryEntryModel
from app.services.storage import gcs_storage, hosted_image_url_prefix, is_hosted_image_url


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
        image_is_external=bool(entry.image_url) and not is_hosted_image_url(entry.image_url),
        location=location,
        coordinates=coordinates,
        social_links=social,
        categories=categories,
        suggested_category=entry.suggested_category,
        featured=entry.featured,
        status=DirectoryEntryStatus(entry.status),
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


def _filter_needs_photo(q):
    no_image = DirectoryEntryModel.image_url.is_(None)
    prefix = hosted_image_url_prefix()
    if prefix:
        external_image = ~DirectoryEntryModel.image_url.like(f"{prefix}%")
        return q.filter(no_image | external_image)
    return q.filter(no_image)


def list_entries(
    db: Session,
    *,
    limit: int = 50,
    offset: int = 0,
    category_slug: CategorySlug | None = None,
    status: DirectoryEntryStatus | None = None,
    needs_photo: bool = False,
) -> list[DirectoryEntryModel]:
    q = db.query(DirectoryEntryModel).options(selectinload(DirectoryEntryModel.categories))
    if category_slug:
        q = q.join(DirectoryEntryModel.categories).filter(CategoryModel.slug == category_slug)
    if status:
        q = q.filter(DirectoryEntryModel.status == status.value)
    if needs_photo:
        q = _filter_needs_photo(q)
    return q.order_by(DirectoryEntryModel.name).offset(offset).limit(limit).all()


def count_entries(
    db: Session,
    category_slug: CategorySlug | None = None,
    status: DirectoryEntryStatus | None = None,
) -> int:
    q = db.query(DirectoryEntryModel)
    if category_slug:
        q = q.join(DirectoryEntryModel.categories).filter(CategoryModel.slug == category_slug)
    if status:
        q = q.filter(DirectoryEntryModel.status == status.value)
    return q.count()


def resolve_categories(db: Session, slugs: list[CategorySlug]) -> list[CategoryModel]:
    if not slugs:
        return []
    categories = db.query(CategoryModel).filter(CategoryModel.slug.in_(slugs)).all()
    found = {c.slug for c in categories}
    missing = set(slugs) - found
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
    entry.suggested_category = (
        body.suggested_category.strip()[:255] if body.suggested_category else None
    )
    entry.featured = body.featured
    entry.status = body.status.value
    entry.user_ids = _serialize_user_ids(body.user_ids)


def get_or_create_edit_token(db: Session, entry: DirectoryEntryModel) -> str:
    if not entry.edit_token:
        entry.edit_token = secrets.token_urlsafe(24)
        db.commit()
    return entry.edit_token


def apply_update_data(
    entry: DirectoryEntryModel, body: DirectoryEntryUpdate | DirectoryEntryPublicUpdate
) -> None:
    fields = body.model_fields_set
    if "name" in fields and body.name is not None:
        entry.name = body.name[:255]
    if "description" in fields:
        entry.description = body.description
    if "image_url" in fields:
        entry.image_url = body.image_url
    if "location" in fields:
        entry.location = body.location.model_dump(exclude_none=True) if body.location else None
    if "social_links" in fields:
        entry.social_links = (
            body.social_links.model_dump(exclude_none=True) if body.social_links else None
        )
    if "suggested_category" in fields:
        entry.suggested_category = (
            body.suggested_category.strip()[:255] if body.suggested_category else None
        )
    if "featured" in fields and body.featured is not None:
        entry.featured = body.featured
    if "status" in fields and body.status is not None:
        entry.status = body.status.value
    if "user_ids" in fields and body.user_ids is not None:
        entry.user_ids = _serialize_user_ids(body.user_ids)


def set_entry_categories(
    db: Session, entry: DirectoryEntryModel, slugs: list[CategorySlug]
) -> None:
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


def slugify_category(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")[:50]


def approve_suggested_category(db: Session, entry: DirectoryEntryModel) -> DirectoryEntryModel:
    """Create a category from the entry's suggested_category, assign it, and clear the field."""
    if not entry.suggested_category:
        raise ValueError("Entry has no suggested category")

    name = entry.suggested_category.strip()
    slug = slugify_category(name)
    if not slug:
        raise ValueError("Suggested category name produces an invalid slug")

    category = db.query(CategoryModel).filter(CategoryModel.slug == slug).first()
    if not category:
        category = CategoryModel(slug=slug, name=name)
        db.add(category)
        db.flush()

    if category not in entry.categories:
        entry.categories.append(category)

    entry.suggested_category = None
    db.commit()
    db.refresh(entry)
    refreshed = get_entry(db, entry.id)
    assert refreshed is not None
    return refreshed


def find_orphaned_images(db: Session) -> list:
    """GCS-hosted directory photos no entry's image_url points to anymore.

    Happens when a photo is re-hosted or replaced (NeedsPhotoPage, edits, sheet sync) —
    nothing deletes the old blob automatically.
    """
    if not gcs_storage:
        return []
    referenced = {
        url
        for (url,) in db.query(DirectoryEntryModel.image_url).filter(
            DirectoryEntryModel.image_url.isnot(None)
        )
    }
    return [b for b in gcs_storage.list_directory_entry_photos() if b.public_url not in referenced]
