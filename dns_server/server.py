# Core DNS logic: query parsing, record lookup

import socketserver
from dnslib import DNSRecord, RR, QTYPE, A, TXT, RCODE
import yaml
import time
from .rate_limiter import PerIPRateLimiter
from .heuristic_detector import EWMAAnomalyDetector
from .cache import SimpleCache
from .metrics_collector import Metrics, MetricsServer

# Load config
with open('dns_server/config.yaml', 'r', encoding='utf-8') as f:
    CFG = yaml.safe_load(f)

ORIGIN = CFG['origin']
LISTEN_HOST = CFG['listen_host']
LISTEN_PORT = int(CFG['listen_port'])
METRICS_HOST = CFG['metrics_host']
METRICS_PORT = int(CFG['metrics_port'])


# Zone
ZONE_A = CFG['records'].get('A', {})
ZONE_TXT = CFG['records'].get('TXT', {})


# Ratelimiter + detector
rl = PerIPRateLimiter(CFG['ratelimit']['per_ip_qps'], CFG['ratelimit']['burst'])
adaptive_cfg = CFG['adaptive']


metrics = Metrics()
metrics.gauges['current_per_ip_qps'] = CFG['ratelimit']['per_ip_qps']
metrics.gauges['current_burst'] = CFG['ratelimit']['burst']

if adaptive_cfg.get('enabled', True):
    detector = EWMAAnomalyDetector(
        alpha=adaptive_cfg['ewma_alpha'],
        qps_high=adaptive_cfg['qps_high'],
        nxdomain_ratio_high=adaptive_cfg['nxdomain_ratio_high'],
        cooldown_seconds=adaptive_cfg['cooldown_seconds']
    )
else:
    detector = None

# Metrics server
ms = MetricsServer(METRICS_HOST, METRICS_PORT, metrics)
ms.start_in_thread()


TTL = 60
CACHE = SimpleCache()

class DNSHandler(socketserver.BaseRequestHandler):
    def handle(self):
        print(f"RX packet from {self.client_address}")
        data, sock = self.request
        client_ip, client_port = self.client_address
        now = time.time()
        metrics.counters['queries_total'] += 1


        if CFG['ratelimit']['enabled'] and not rl.allow(client_ip):
            metrics.counters['dropped_ratelimit'] += 1
            try:
                req = DNSRecord.parse(data)
                reply = req.reply()
                reply.header.rcode = RCODE.REFUSED
                print(f"TX reply rcode={reply.header.rcode} qname={req.q.qname} qtype={QTYPE[req.q.qtype]}")
                sock.sendto(bytes(reply.pack()), self.client_address)
            except Exception:
                pass
            return


        try:
            req = DNSRecord.parse(data)
        except Exception:
            return
        
        qname = str(req.q.qname).lower()
        qtype = QTYPE[req.q.qtype]


        # Cache lookup
        cache_key = (qname, qtype)
        cached = CACHE.get(cache_key)
        if cached:
            reply = cached
        else:
            reply = req.reply()
            # Only serve under the configured origin (authoritative subset)
            if not qname.endswith(ORIGIN):
                reply.header.rcode = RCODE.NXDOMAIN
            else:
                label = qname.replace('.' + ORIGIN, '').rstrip('.')
                if qtype == 'A' and label in ZONE_A:
                    reply.add_answer(RR(qname, QTYPE.A, rdata=A(ZONE_A[label]), ttl=TTL))
                    metrics.counters['responses_noerror'] += 1
                    CACHE.put(cache_key, reply, ttl=TTL)
                elif qtype == 'TXT' and label in ZONE_TXT:
                    reply.add_answer(RR(qname, QTYPE.TXT, rdata=TXT(ZONE_TXT[label]), ttl=TTL))
                    metrics.counters['responses_noerror'] += 1
                    CACHE.put(cache_key, reply, ttl=TTL)
                else:
                    reply.header.rcode = RCODE.NXDOMAIN
                    metrics.counters['responses_nxdomain'] += 1

        # Adaptive tuning (lightweight)
        if detector is not None and adaptive_cfg.get('enabled', True):
            obs = detector.update(metrics.counters)
            metrics.gauges['ewma_qps'] = obs['qps']
            metrics.gauges['nxd_ratio'] = obs['nxd_ratio']
            if obs['anomaly']:
                base_qps = CFG['ratelimit']['per_ip_qps']
                new_qps = max(1.0, base_qps * adaptive_cfg['upscale_factor'])
                rl.set_limits(new_qps, CFG['ratelimit']['burst'])
                metrics.gauges['current_per_ip_qps'] = new_qps
            else:
                # gently recover toward base
                cur, burst = rl.limits
                base = CFG['ratelimit']['per_ip_qps']
                if cur < base:
                    cur = min(base, cur * adaptive_cfg['downscale_recovery'])
                    rl.set_limits(cur, burst)
                    metrics.gauges['current_per_ip_qps'] = cur

        # Send reply
        try:
            sock.sendto(bytes(reply.pack()), self.client_address)
        except Exception:
            pass


if __name__ == '__main__':
    with socketserver.ThreadingUDPServer((LISTEN_HOST, LISTEN_PORT), DNSHandler) as server:
        print(f"DNS server listening on {LISTEN_HOST}:{LISTEN_PORT} (origin {ORIGIN})")
        print(f"Metrics at http://{METRICS_HOST}:{METRICS_PORT}/metrics")
        try:
            server.serve_forever(poll_interval=0.5)
        except KeyboardInterrupt:
            print("\nShutting down…")