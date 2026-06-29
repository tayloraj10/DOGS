import re

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

_FOLLOWER_COUNT_RE = re.compile(r"^[\d.,]+[KkMm]?$")
_MAX_HANDLE_LEN = 200

_US_COUNTRY_ALIASES = {
    "",
    "us",
    "usa",
    "u.s.",
    "u.s.a.",
    "united states",
    "united states of america",
}

# Maps lowercased aliases to canonical country names.
_COUNTRY_ALIAS_TO_CANONICAL: dict[str, str] = {
    alias: "United States"
    for alias in [
        "us", "usa", "u.s.", "u.s.a.", "united states", "united states of america",
        "america",
    ]
}
_COUNTRY_ALIAS_TO_CANONICAL.update(
    {
        alias: "United Kingdom"
        for alias in [
            "uk", "gb", "gbr", "great britain", "united kingdom",
            "britain", "england", "scotland", "wales", "northern ireland",
        ]
    }
)

_US_STATE_NAME_TO_ABBR = {
    "alabama": "AL",
    "alaska": "AK",
    "arizona": "AZ",
    "arkansas": "AR",
    "california": "CA",
    "colorado": "CO",
    "connecticut": "CT",
    "delaware": "DE",
    "florida": "FL",
    "georgia": "GA",
    "hawaii": "HI",
    "idaho": "ID",
    "illinois": "IL",
    "indiana": "IN",
    "iowa": "IA",
    "kansas": "KS",
    "kentucky": "KY",
    "louisiana": "LA",
    "maine": "ME",
    "maryland": "MD",
    "massachusetts": "MA",
    "michigan": "MI",
    "minnesota": "MN",
    "mississippi": "MS",
    "missouri": "MO",
    "montana": "MT",
    "nebraska": "NE",
    "nevada": "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    "ohio": "OH",
    "oklahoma": "OK",
    "oregon": "OR",
    "pennsylvania": "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    "tennessee": "TN",
    "texas": "TX",
    "utah": "UT",
    "vermont": "VT",
    "virginia": "VA",
    "washington": "WA",
    "west virginia": "WV",
    "wisconsin": "WI",
    "wyoming": "WY",
    "district of columbia": "DC",
    "washington dc": "DC",
    "washington d.c.": "DC",
    "puerto rico": "PR",
    "guam": "GU",
    "american samoa": "AS",
    "u.s. virgin islands": "VI",
    "virgin islands": "VI",
    "northern mariana islands": "MP",
}

_US_STATE_ABBR_TO_NAME: dict[str, str] = {
    abbr: name.title()
    for name, abbr in _US_STATE_NAME_TO_ABBR.items()
    if name not in {"washington dc", "washington d.c.", "u.s. virgin islands", "virgin islands"}
}
# Fix title-case edge cases
_US_STATE_ABBR_TO_NAME.update(
    {
        "DC": "District of Columbia",
        "VI": "U.S. Virgin Islands",
        "MP": "Northern Mariana Islands",
    }
)

_VALID_US_STATE_ABBRS = frozenset(_US_STATE_NAME_TO_ABBR.values()) | {"DC"}

# Matches a profile URL on each platform and captures the username segment.
_PLATFORM_URL_PATTERNS: dict[str, re.Pattern[str]] = {
    "instagram": re.compile(r"instagram\.com/([A-Za-z0-9_.]+)", re.I),
    "tiktok": re.compile(r"tiktok\.com/@?([A-Za-z0-9_.]+)", re.I),
    "youtube": re.compile(r"youtube\.com/(?:@|c/|channel/|user/)?([A-Za-z0-9_.-]+)", re.I),
    "facebook": re.compile(r"facebook\.com/(?:pages/)?([A-Za-z0-9_.\-]+)", re.I),
    "twitter": re.compile(r"(?:twitter|x)\.com/([A-Za-z0-9_]+)", re.I),
}

# Path segments that look like a username but aren't one (e.g. instagram.com/p/<post-id>).
_RESERVED_PATH_SEGMENTS = {
    "p",
    "reel",
    "tv",
    "explore",
    "status",
    "i",
    "share",
    "watch",
    "video",
    "home",
}


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


def _extract_username_from_url(field: str, value: str) -> str:
    """If value is a full profile URL for the given platform, pull out just the username."""
    pattern = _PLATFORM_URL_PATTERNS.get(field)
    if not pattern:
        return value
    match = pattern.search(value)
    if not match:
        return value
    candidate = match.group(1).strip("/")
    if not candidate or candidate.lower() in _RESERVED_PATH_SEGMENTS:
        return value
    return candidate


_US_ZIP_RE = re.compile(r"^\d{5}(-\d{4})?$")


def is_us_country(country: str | None) -> bool:
    return (country or "").strip().lower() in _US_COUNTRY_ALIASES


def validate_us_zip(zip_code: str) -> str:
    """Accepts a 5-digit or ZIP+4 US zip code."""
    normalized = zip_code.strip()
    if not _US_ZIP_RE.match(normalized):
        raise ValueError("Zip code must be 5 digits or ZIP+4 (e.g. 12345 or 12345-6789).")
    return normalized


def normalize_country(country: str) -> str:
    """Returns the canonical country name for common aliases (e.g. 'US' → 'United States').
    Returns the original value unchanged if no alias matches."""
    canonical = _COUNTRY_ALIAS_TO_CANONICAL.get(country.strip().lower())
    return canonical if canonical is not None else country.strip()


def validate_us_state(state: str) -> str:
    """Accepts a 2-letter US state/territory code or a full state name and
    returns the canonical full name (e.g. 'Pennsylvania')."""
    normalized = state.strip().upper()
    if len(normalized) == 2 and normalized.isalpha() and normalized in _VALID_US_STATE_ABBRS:
        return _US_STATE_ABBR_TO_NAME[normalized]
    by_abbr = _US_STATE_NAME_TO_ABBR.get(state.strip().lower())
    if by_abbr:
        return _US_STATE_ABBR_TO_NAME[by_abbr]
    raise ValueError(
        "State must be a 2-letter US state code or full state name (e.g. CA or California)."
    )


class StructuredLocation(BaseModel):
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    country: str | None = None

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="after")
    def _normalize_location(self) -> "StructuredLocation":
        if self.country:
            self.country = normalize_country(self.country)
        if is_us_country(self.country) and self.state:
            try:
                self.state = validate_us_state(self.state)
            except ValueError:
                pass
        return self


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
    def normalize_handle(cls, value: object, info) -> str | None:
        if value is None:
            return None
        cleaned = _clean_social_value(str(value))
        if cleaned is None:
            return None
        if info.field_name == "website":
            return cleaned
        return _extract_username_from_url(info.field_name, cleaned)
