# Publishes stats to dashboard API

import threading
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, PlainTextResponse
import uvicorn


class Metrics:
    def __init__(self):
        self.counters = {
            'queries_total': 0,
            'responses_noerror': 0,
            'responses_nxdomain': 0,
            'dropped_ratelimit': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'latency_count': 0,
            'latency_sum_ms': 0.0,
        }
        self.gauges = {
            'current_per_ip_qps': 0,
            'current_burst': 0,
            'ewma_qps': 0.0,
            'nxd_ratio': 0.0,
            'avg_latency_ms': 0.0,
            'cache_hit_ratio': 0.0,
        }


    def as_dict(self):
        return {**self.counters, **self.gauges}

    def as_prometheus(self):
        """Return metrics in Prometheus text exposition format."""
        lines = []
        
        # Counter metrics
        lines.append("# HELP dns_queries_total Total number of DNS queries received")
        lines.append("# TYPE dns_queries_total counter")
        lines.append(f"dns_queries_total {self.counters['queries_total']}")
        
        lines.append("# HELP dns_responses_noerror Total successful DNS responses")
        lines.append("# TYPE dns_responses_noerror counter")
        lines.append(f"dns_responses_noerror {self.counters['responses_noerror']}")
        
        lines.append("# HELP dns_responses_nxdomain Total NXDOMAIN responses")
        lines.append("# TYPE dns_responses_nxdomain counter")
        lines.append(f"dns_responses_nxdomain {self.counters['responses_nxdomain']}")
        
        lines.append("# HELP dns_dropped_ratelimit Requests dropped due to rate limiting")
        lines.append("# TYPE dns_dropped_ratelimit counter")
        lines.append(f"dns_dropped_ratelimit {self.counters['dropped_ratelimit']}")
        
        lines.append("# HELP dns_cache_hits Cache hit count")
        lines.append("# TYPE dns_cache_hits counter")
        lines.append(f"dns_cache_hits {self.counters['cache_hits']}")
        
        lines.append("# HELP dns_cache_misses Cache miss count")
        lines.append("# TYPE dns_cache_misses counter")
        lines.append(f"dns_cache_misses {self.counters['cache_misses']}")
        
        lines.append("# HELP dns_latency_sum_ms Sum of latency in milliseconds")
        lines.append("# TYPE dns_latency_sum_ms counter")
        lines.append(f"dns_latency_sum_ms {self.counters['latency_sum_ms']}")
        
        lines.append("# HELP dns_latency_count Number of latency measurements")
        lines.append("# TYPE dns_latency_count counter")
        lines.append(f"dns_latency_count {self.counters['latency_count']}")
        
        # Gauge metrics
        lines.append("# HELP dns_current_per_ip_qps Current per-IP QPS limit")
        lines.append("# TYPE dns_current_per_ip_qps gauge")
        lines.append(f"dns_current_per_ip_qps {self.gauges['current_per_ip_qps']}")
        
        lines.append("# HELP dns_current_burst Current burst capacity")
        lines.append("# TYPE dns_current_burst gauge")
        lines.append(f"dns_current_burst {self.gauges['current_burst']}")
        
        lines.append("# HELP dns_ewma_qps EWMA smoothed queries per second")
        lines.append("# TYPE dns_ewma_qps gauge")
        lines.append(f"dns_ewma_qps {self.gauges['ewma_qps']}")
        
        lines.append("# HELP dns_nxdomain_ratio Ratio of NXDOMAIN responses")
        lines.append("# TYPE dns_nxdomain_ratio gauge")
        lines.append(f"dns_nxdomain_ratio {self.gauges['nxd_ratio']}")
        
        lines.append("# HELP dns_avg_latency_ms Average response latency in ms")
        lines.append("# TYPE dns_avg_latency_ms gauge")
        lines.append(f"dns_avg_latency_ms {self.gauges['avg_latency_ms']}")
        
        lines.append("# HELP dns_cache_hit_ratio Cache hit ratio")
        lines.append("# TYPE dns_cache_hit_ratio gauge")
        lines.append(f"dns_cache_hit_ratio {self.gauges['cache_hit_ratio']}")
        
        return "\n".join(lines) + "\n"


class MetricsServer:
    def __init__(self, host: str, port: int, metrics: Metrics):
        self.app = FastAPI()
        self.metrics = metrics

        @self.app.get('/metrics')
        def get_metrics(request: Request):
            # Check Accept header for Prometheus format
            accept = request.headers.get('accept', '')
            if 'text/plain' in accept or 'application/openmetrics-text' in accept:
                return PlainTextResponse(
                    self.metrics.as_prometheus(),
                    media_type='text/plain; version=0.0.4; charset=utf-8'
                )
            # Default: return Prometheus format for compatibility
            return PlainTextResponse(
                self.metrics.as_prometheus(),
                media_type='text/plain; version=0.0.4; charset=utf-8'
            )

        @self.app.get('/metrics/json')
        def get_metrics_json():
            """JSON endpoint for the dashboard frontend."""
            return JSONResponse(self.metrics.as_dict())

        self.host, self.port = host, port


    def start_in_thread(self):
        thread = threading.Thread(target=lambda: uvicorn.run(self.app, host=self.host, port=self.port, log_level='warning'), daemon=True)
        thread.start()
        return thread