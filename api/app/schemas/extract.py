from pydantic import BaseModel, Field

from app.schemas.location import SocialLinks


class DirectoryExtractRequest(BaseModel):
    url: str


class DirectoryExtractResponse(BaseModel):
    name: str | None = None
    description: str | None = None
    image_url: str | None = None
    social_links: SocialLinks | None = None
    other_links: list[str] = Field(default_factory=list)
    source_url: str
