import logging

logger = logging.getLogger(__name__)


def sanitize_image_url(raw: str | None) -> tuple[str | None, str | None]:
    """Return (url, skip_reason). skip_reason is set when url is rejected."""
    if not raw or not str(raw).strip():
        return None, None

    s = str(raw).strip()
    if s.lower().startswith("data:"):
        return None, "base64_data_uri"

    if not (s.startswith("http://") or s.startswith("https://")):
        return None, "invalid_scheme"

    if len(s) > 4096:
        return None, "url_too_long"

    return s, None
