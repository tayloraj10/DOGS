from enum import StrEnum


class CategorySlug(StrEnum):
    animals = "animals"
    environment = "environment"
    fitness = "fitness"
    nature = "nature"
    trash = "trash"
    water = "water"


CATEGORY_DISPLAY_NAMES: dict[CategorySlug, str] = {
    CategorySlug.animals: "Animals",
    CategorySlug.environment: "Environment",
    CategorySlug.fitness: "Fitness",
    CategorySlug.nature: "Nature",
    CategorySlug.trash: "Trash",
    CategorySlug.water: "Water",
}

_NAME_TO_SLUG: dict[str, CategorySlug] = {
    name.lower(): slug for slug, name in CATEGORY_DISPLAY_NAMES.items()
}


def category_slug_from_label(label: str) -> CategorySlug | None:
    """Map a display name (e.g. 'Trash') or slug to CategorySlug."""
    normalized = label.strip().lower()
    if not normalized:
        return None
    try:
        return CategorySlug(normalized)
    except ValueError:
        pass
    return _NAME_TO_SLUG.get(normalized)
