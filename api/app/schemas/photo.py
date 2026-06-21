from pydantic import BaseModel


class DirectoryPhotoUploadResponse(BaseModel):
    url: str


class DirectoryPhotoFromUrlRequest(BaseModel):
    url: str
