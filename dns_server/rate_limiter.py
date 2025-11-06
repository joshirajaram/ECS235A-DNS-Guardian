# Adaptive rate-limiting logic
from __future__ import annotations
import time
from dataclasses import dataclass
from threading import Lock


@dataclass
class TokenBucket:
    capacity: float
    tokens: float
    refill_rate: float # tokens per second
    last: float


class PerIPRateLimiter:
    """Simple token bucket per client IP."""
    def __init__(self, per_ip_qps: float, burst: float):
        self._per_ip_qps = max(1.0, float(per_ip_qps))
        self._burst = max(self._per_ip_qps, float(burst))
        self._buckets: dict[str, TokenBucket] = {}
        self._lock = Lock()


    def _bucket(self, ip: str) -> TokenBucket:
        now = time.time()
        b = self._buckets.get(ip)
        if not b:
            b = TokenBucket(self._burst, self._burst, self._per_ip_qps, now)
            self._buckets[ip] = b
            return b
        # refill
        delta = max(0.0, now - b.last)
        b.tokens = min(b.capacity, b.tokens + delta * b.refill_rate)
        b.last = now
        return b


    def allow(self, ip: str) -> bool:
        with self._lock:
            b = self._bucket(ip)
            if b.tokens >= 1.0:
                b.tokens -= 1.0
                return True
            return False


    def set_limits(self, per_ip_qps: float, burst: float | None = None):
        with self._lock:
            self._per_ip_qps = max(1.0, float(per_ip_qps))
            self._burst = float(burst) if burst is not None else max(self._burst, self._per_ip_qps)
            now = time.time()
            for ip, b in self._buckets.items():
                b.capacity = self._burst
                b.refill_rate = self._per_ip_qps
                b.tokens = min(b.tokens, b.capacity)
                b.last = now


    @property
    def limits(self) -> tuple[float, float]:
        return self._per_ip_qps, self._burst