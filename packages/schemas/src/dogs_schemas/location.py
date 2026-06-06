import re

from pydantic import BaseModel, ConfigDict, field_validator

_FOLLOWER_COUNT_RE = re.compile(r"^[\d.,]+[KkMm]?$")
_MAX_HANDLE_LEN = 200


def _clean_social_value(value: str | None) -> str | None:
    if value is None:
        return None
    s = str(value).strip().lstrip("@")
    if not s:
        return None
    if _FOLLOWER_COUNT_RE.match(s.replace(" ", "")):
        return None
    if len(s) > _MAX_HANDLE_LEN:
        return None
    return s


class StructuredLocation(BaseModel):
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    country: str | None = None

    model_config = ConfigDict(extra="ignore")


class Coordinates(BaseModel):
    latitude: float
    longitude: float


class SocialLinks(BaseModel):
    website: str | None = None
    instagram: str | None = None
    tiktok: str | None = None
    youtube: str | None = None
    facebook: str | None = None
    twitter: str | None = None

    model_config = ConfigDict(extra="ignore")

    @field_validator(
        "website",
        "instagram",
        "tiktok",
        "youtube",
        "facebook",
        "twitter",
        mode="before",
    )
    @classmethod
    def normalize_handle(cls, value: object) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            cleaned = _clean_social_value(value)
            if cleaned and cleaned.startswith("http"):
                return cleaned
            return cleaned
        return _clean_social_value(str(value))
