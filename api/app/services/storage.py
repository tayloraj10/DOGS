import logging
import os
import uuid
from pathlib import Path
from typing import BinaryIO

from google.cloud.exceptions import GoogleCloudError
from google.cloud.storage import Client

from app.config import settings

logger = logging.getLogger(__name__)

_REPO_ROOT = Path(__file__).resolve().parents[3]

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"}


class GCSStorage:
    def __init__(self):
        if not settings.GCS_DIRECTORY_IMAGES_BUCKET:
            raise ValueError("GCS_DIRECTORY_IMAGES_BUCKET is not configured")

        self.bucket_name = settings.GCS_DIRECTORY_IMAGES_BUCKET

        # In dev/testing, prefix all paths so test uploads are easy to find and delete
        if settings.ENVIRONMENT and settings.ENVIRONMENT.lower() != "production":
            self._path_prefix = f"{settings.ENVIRONMENT.lower()}/"
        else:
            self._path_prefix = ""

        # If GOOGLE_APPLICATION_CREDENTIALS is set, use it (local dev).
        # Otherwise rely on Application Default Credentials (Cloud Run workload identity).
        if settings.GOOGLE_APPLICATION_CREDENTIALS:
            creds_path = Path(settings.GOOGLE_APPLICATION_CREDENTIALS)
            if not creds_path.is_absolute():
                creds_path = _REPO_ROOT / creds_path
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(creds_path)
        self.client = Client(project=settings.GCS_PROJECT_ID or None)

    def _path(self, path: str) -> str:
        return f"{self._path_prefix}{path}"

    def validate_image_file(self, filename: str) -> tuple[bool, str | None]:
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return False, f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        return True, None

    def upload_directory_entry_photo(
        self,
        file: BinaryIO,
        filename: str,
        content_type: str = "image/jpeg",
    ) -> str:
        try:
            bucket = self.client.bucket(self.bucket_name)
            ext = os.path.splitext(filename)[1].lower()
            blob_name = self._path(f"directory/{uuid.uuid4()}{ext}")
            blob = bucket.blob(blob_name)
            blob.content_type = content_type
            blob.cache_control = "public, max-age=31536000, immutable"
            file.seek(0)
            blob.upload_from_file(file, content_type=content_type)
            return blob.public_url
        except GoogleCloudError as e:
            raise Exception(f"Failed to upload photo to GCS: {e}")

    def list_directory_entry_photos(self):
        bucket = self.client.bucket(self.bucket_name)
        return list(bucket.list_blobs(prefix=self._path("directory/")))

    def delete_blob(self, blob_name: str) -> None:
        try:
            self.client.bucket(self.bucket_name).blob(blob_name).delete()
        except GoogleCloudError as e:
            raise Exception(f"Failed to delete blob from GCS: {e}")


gcs_storage = GCSStorage() if settings.GCS_DIRECTORY_IMAGES_BUCKET else None


def hosted_image_url_prefix() -> str | None:
    """Public URL prefix for photos we've re-hosted in our own bucket, or None if storage
    isn't configured (in which case nothing can be considered "hosted")."""
    if not gcs_storage:
        return None
    return f"https://storage.googleapis.com/{gcs_storage.bucket_name}/"


def is_hosted_image_url(url: str | None) -> bool:
    prefix = hosted_image_url_prefix()
    if not url or not prefix:
        return False
    return url.startswith(prefix)
