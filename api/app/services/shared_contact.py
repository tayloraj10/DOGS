from app.models.user import User

SOCIAL_FIELDS = (
    "website",
    "instagram",
    "tiktok",
    "youtube",
    "facebook",
    "twitter",
    "app_store",
    "google_play",
    "github",
    "discord",
)


def resolve_shared_contact(user: User, shared_fields: list[str]) -> dict[str, str]:
    """Filters a user's contact info down to the channels they've opted to share,
    e.g. with a project team or an idea's other interested builders."""
    available: dict[str, str | None] = {"email": user.email, "phone": user.phone}
    if user.social_links:
        for field in SOCIAL_FIELDS:
            available[field] = user.social_links.get(field)

    shared_contact: dict[str, str] = {}
    for field in shared_fields:
        value = available.get(field)
        if value:
            shared_contact[field] = value
    return shared_contact
