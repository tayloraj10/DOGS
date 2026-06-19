from enum import StrEnum


class ActivityStatus(StrEnum):
    """Shared lifecycle status for cleanups and trash reports."""

    open = "open"
    scheduled = "scheduled"
    in_progress = "in_progress"
    completed = "completed"
    addressed = "addressed"
    verified = "verified"
    cancelled = "cancelled"
