from app.schemas import Category as CategorySchema
from app.services.directory_service import slugify_category
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Category

router = APIRouter(prefix="/categories", tags=["categories"])


class CategoryCreate(BaseModel):
    name: str


@router.get("", response_model=list[CategorySchema])
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).order_by(Category.name).all()
    return [CategorySchema(id=c.id, slug=c.slug, name=c.name) for c in categories]


@router.post("", response_model=CategorySchema, status_code=status.HTTP_201_CREATED)
def create_category(body: CategoryCreate, db: Session = Depends(get_db)):
    name = body.name.strip()[:100]
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    slug = slugify_category(name)
    if not slug:
        raise HTTPException(status_code=400, detail="Name produces an invalid slug")

    existing = db.query(Category).filter(Category.slug == slug).first()
    if existing:
        return CategorySchema(id=existing.id, slug=existing.slug, name=existing.name)

    category = Category(slug=slug, name=name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return CategorySchema(id=category.id, slug=category.slug, name=category.name)
