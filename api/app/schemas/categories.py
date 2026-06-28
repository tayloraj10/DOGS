import re

# CategorySlug is a plain str — slugs are DB-defined, not code-defined
CategorySlug = str


def category_slug_from_label(label: str) -> str | None:
    """Convert a free-text category label to a slug (no DB validation)."""
    s = label.strip().lower()
    if not s:
        return None
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s.strip("-")[:50] or None
