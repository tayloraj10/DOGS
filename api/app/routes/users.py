from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User as UserModel
from app.schemas import User, UserUpdate
from app.services.auth import get_current_user
from app.services.user_service import update_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=User)
def get_my_profile(user: UserModel = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=User)
def update_my_profile(
    body: UserUpdate,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_user(db, user, body)
