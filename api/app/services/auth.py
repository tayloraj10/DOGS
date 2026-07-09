import os
from pathlib import Path

import firebase_admin
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User as UserModel
from app.services.user_service import get_or_create_user

_REPO_ROOT = Path(__file__).resolve().parents[3]

try:
    firebase_admin.get_app()
except ValueError:
    # Same pattern as GCSStorage: use GOOGLE_APPLICATION_CREDENTIALS if set (local dev),
    # otherwise fall back to Application Default Credentials (Cloud Run workload identity).
    if settings.GOOGLE_APPLICATION_CREDENTIALS:
        creds_path = Path(settings.GOOGLE_APPLICATION_CREDENTIALS)
        if not creds_path.is_absolute():
            creds_path = _REPO_ROOT / creds_path
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(creds_path)
    firebase_admin.initialize_app()

_bearer_scheme = HTTPBearer(auto_error=False)


def verify_id_token(token: str) -> dict:
    """Verifies a Firebase ID token's signature and claims. Raises HTTPException(401) on
    any invalid/expired/malformed token rather than trusting anything client-supplied."""
    try:
        return firebase_auth.verify_id_token(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        ) from e


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> UserModel:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    claims = verify_id_token(credentials.credentials)
    return get_or_create_user(db, claims)


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> UserModel | None:
    """Same as get_current_user, but returns None instead of raising when there's no
    token or the token is invalid — for routes that work signed out but should attach an
    identity when one is available."""
    if credentials is None:
        return None
    try:
        claims = verify_id_token(credentials.credentials)
    except HTTPException:
        return None
    return get_or_create_user(db, claims)


def require_admin(user: UserModel = Depends(get_current_user)) -> UserModel:
    if not user.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
