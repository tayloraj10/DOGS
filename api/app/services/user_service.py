from sqlalchemy.orm import Session

from app.models import User as UserModel
from app.schemas import UserUpdate


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
