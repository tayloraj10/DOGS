import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    """Sliding-window rate limiter keyed by client IP. State is per-process, not shared
    across instances, so this is a speed bump against casual spam/scripts rather than a
    hard guarantee — proportionate for a low-traffic public endpoint without pulling in
    Redis or a new dependency."""

    def __init__(self, max_requests: int, window_seconds: float):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] > self.window_seconds:
                hits.popleft()
            if len(hits) >= self.max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many idea submissions from this address. Try again later.",
                )
            hits.append(now)


_idea_creation_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=3600)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit_idea_creation(request: Request) -> None:
    _idea_creation_limiter.check(_client_ip(request))
