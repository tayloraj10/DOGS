from dogs_schemas import Category as CategorySchema, CategorySlug
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Category

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategorySchema])
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).order_by(Category.name).all()
    return [
        CategorySchema(id=c.id, slug=CategorySlug(c.slug), name=c.name)
        for c in categories
    ]
