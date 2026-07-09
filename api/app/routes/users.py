from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User as UserModel
from app.schemas import User, UserUpdate
from app.services.auth import get_current_user
from app.services.storage import ALLOWED_CONTENT_TYPES, user_images_storage
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


@router.post("/me/photo", response_model=User)
async def upload_my_photo(
    file: UploadFile = File(...),
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user_images_storage:
        raise HTTPException(status_code=500, detail="Cloud storage is not configured")
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    is_valid, error_msg = user_images_storage.validate_image_file(file.filename)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content type. Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}",
        )

    try:
        url = user_images_storage.upload_user_photo(file.file, file.filename, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {e}")

    return update_user(db, user, UserUpdate(photo_url=url))
