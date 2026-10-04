import time
from collections import defaultdict, deque


class FailureLimiter:
    """In-memory sliding-window counter of failed attempts per key.

    Process-local, which is fine for the single-process MVP deployment.
    """

    def __init__(self) -> None:
        self._failures: dict[str, deque[float]] = defaultdict(deque)

    def _prune(self, key: str, window: float) -> deque[float]:
        q = self._failures[key]
        cutoff = time.monotonic() - window
        while q and q[0] < cutoff:
            q.popleft()
        return q

    def is_blocked(self, key: str, max_failures: int, window: float) -> bool:
        return len(self._prune(key, window)) >= max_failures

    def record_failure(self, key: str) -> None:
        self._failures[key].append(time.monotonic())

    def reset(self, key: str | None = None) -> None:
        if key is None:
            self._failures.clear()
        else:
            self._failures.pop(key, None)


login_limiter = FailureLimiter()
