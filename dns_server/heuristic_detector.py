# Simple DoS anomaly detection module
import time
from collections import deque


class EWMAAnomalyDetector:
    def __init__(self, alpha=0.3, qps_high=2000, nxdomain_ratio_high=0.3, cooldown_seconds=10):
        self.alpha = alpha
        self.qps_high = qps_high
        self.nxdomain_ratio_high = nxdomain_ratio_high
        self.cooldown = cooldown_seconds
        self.ewma_qps = 0.0
        self._last_ts = time.time()
        self._last_total = 0
        self._last_nxd = 0
        self._last_noerror = 0
        self._last_trigger = 0


    def update(self, totals: dict) -> dict:
        now = time.time()
        dt = max(1e-6, now - self._last_ts)
        q_total = totals.get('queries_total', 0)
        nxd = totals.get('responses_nxdomain', 0)
        ok = totals.get('responses_noerror', 0)


        dq = q_total - self._last_total
        self.ewma_qps = self.alpha * (dq / dt) + (1 - self.alpha) * self.ewma_qps
        dnxd = max(0, nxd - self._last_nxd)
        dok = max(1, ok - self._last_noerror)
        ratio = dnxd / (dnxd + dok)


        self._last_ts = now
        self._last_total = q_total
        self._last_nxd = nxd
        self._last_noerror = ok


        hit = (self.ewma_qps > self.qps_high) or (ratio > self.nxdomain_ratio_high and self.ewma_qps > self.qps_high/4)
        if hit and now - self._last_trigger > self.cooldown:
            self._last_trigger = now
            return {"anomaly": True, "qps": self.ewma_qps, "nxd_ratio": ratio}
        return {"anomaly": False, "qps": self.ewma_qps, "nxd_ratio": ratio}
