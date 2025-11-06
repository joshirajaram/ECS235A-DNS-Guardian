# Publishes stats to dashboard API

import threading
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import uvicorn


class Metrics:
    def __init__(self):
        self.counters = {
            'queries_total': 0,
            'responses_noerror': 0,
            'responses_nxdomain': 0,
            'dropped_ratelimit': 0,
        }
        self.gauges = {
            'current_per_ip_qps': 0,
            'current_burst': 0,
            'ewma_qps': 0.0,
            'nxd_ratio': 0.0,
        }


    def as_dict(self):
        return {**self.counters, **self.gauges}


class MetricsServer:
    def __init__(self, host: str, port: int, metrics: Metrics):
        self.app = FastAPI()
        self.metrics = metrics
        @self.app.get('/metrics')
        def get_metrics():
            return JSONResponse(self.metrics.as_dict())
        self.host, self.port = host, port


    def start_in_thread(self):
        thread = threading.Thread(target=lambda: uvicorn.run(self.app, host=self.host, port=self.port, log_level='warning'), daemon=True)
        thread.start()
        return thread