from sqlalchemy.orm import Session

from app.models import User as UserModel
from app.schemas import UserUpdate
from app.services.storage import user_images_storage


def get_or_create_user(db: Session, claims: dict) -> UserModel:
    firebase_uid = claims["uid"]
    user = db.query(UserModel).filter(UserModel.firebase_uid == firebase_uid).first()
    if user:
        return user

    user = UserModel(
        firebase_uid=firebase_uid,
        email=claims.get("email") or f"{firebase_uid}@users.noreply.dogs",
        name=claims.get("name"),
        photo_url=claims.get("picture"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user: UserModel, body: UserUpdate) -> UserModel:
    fields = body.model_fields_set
    if "name" in fields:
        user.name = body.name
    if "photo_url" in fields:
        user.photo_url = body.photo_url
    db.commit()
    db.refresh(user)
    return user


def find_orphaned_images(db: Session) -> list:
    """GCS-hosted profile photos no user's photo_url points to anymore.

    Happens when a user re-uploads a new profile photo — nothing deletes the old blob.
    """
    if not user_images_storage:
        return []
    referenced = {
        url for (url,) in db.query(UserModel.photo_url).filter(UserModel.photo_url.isnot(None))
    }
    return [b for b in user_images_storage.list_user_photos() if b.public_url not in referenced]
