# Aggregates metrics for comparison
#!/usr/bin/env python3
"""
Collect aggregated DNS metrics from one or more /metrics endpoints and
write them as a single, system-wide time series to a CSV file.

At each timestamp, metrics from all instances are fetched, aggregated,
and a single CSV row is written.

Example:

  # Static mode run (60 seconds)
  python scripts/collect_metrics.py \
      --ports 8000,8001,8002 \
      --names dns1,dns2,dns3 \
      --interval 1.0 \
      --duration 60 \
      --label static \
      --out static_run.csv
"""

import argparse
import csv
import time
from datetime import datetime

import requests


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Poll /metrics from DNS replicas and store aggregated time-series CSV."
    )
    p.add_argument(
        "--host",
        default="127.0.0.1",
        help="Host where metrics are exposed (default: 127.0.0.1)",
    )
    p.add_argument(
        "--ports",
        required=True,
        help="Comma-separated list of ports, e.g. 8000,8001,8002",
    )
    p.add_argument(
        "--names",
        default=None,
        help=(
            "Comma-separated list of instance names matching ports "
            "(e.g. dns1,dns2,dns3). If omitted, names will be dns1,dns2,..."
        ),
    )
    p.add_argument(
        "--interval",
        type=float,
        default=1.0,
        help="Polling interval in seconds (default: 1.0)",
    )
    p.add_argument(
        "--duration",
        type=float,
        default=60.0,
        help="Total duration in seconds (default: 60). Use <=0 for infinite.",
    )
    p.add_argument(
        "--label",
        default="run",
        help="Label for this run (e.g. 'static', 'adaptive')",
    )
    p.add_argument(
        "--out",
        required=True,
        help="Output CSV file path",
    )
    return p.parse_args()


def build_instances(host: str, ports_csv: str, names_csv: str | None):
    ports = [p.strip() for p in ports_csv.split(",") if p.strip()]
    if not ports:
        raise ValueError("No ports provided")

    if names_csv:
        names = [n.strip() for n in names_csv.split(",") if n.strip()]
        if len(names) != len(ports):
            raise ValueError("Number of names must match number of ports")
    else:
        names = [f"dns{i+1}" for i in range(len(ports))]

    instances = []
    for name, port in zip(names, ports):
        url = f"http://{host}:{port}/metrics"
        instances.append({"name": name, "url": url})
    return instances


def main():
    args = parse_args()
    instances = build_instances(args.host, args.ports, args.names)

    print("Collecting aggregated metrics from instances:")
    for inst in instances:
        print(f"  {inst['name']}: {inst['url']}")
    print(f"Writing CSV to: {args.out}")
    print(f"Run label: {args.label}")
    print(f"Interval: {args.interval}s, Duration: {args.duration}s")
    print("Press Ctrl+C to stop.\n")

    # We aggregate counters by sum, gauges by average.
    fieldnames = [
        "timestamp",
        "label",
        "instance_count",          # number of instances successfully polled

        # summed counters (cluster-wide)
        "queries_total_sum",
        "responses_noerror_sum",
        "responses_nxdomain_sum",
        "dropped_ratelimit_sum",
        "cache_hits_sum",
        "cache_misses_sum",
        "latency_count_sum",
        "latency_sum_ms_sum",

        # derived cluster-wide metrics (averaged gauges)
        "avg_latency_ms_avg",
        "cache_hit_ratio_avg",
        "current_per_ip_qps_avg",
        "current_burst_avg",
        "ewma_qps_avg",
        "nxd_ratio_avg",
    ]

    start = time.time()
    end = start + args.duration if args.duration > 0 else None

    with open(args.out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        try:
            while True:
                now = time.time()
                if end is not None and now >= end:
                    break

                ts = datetime.utcnow().isoformat(timespec="milliseconds") + "Z"

                # Aggregation accumulators
                cnt_queries_total = 0
                cnt_responses_noerror = 0
                cnt_responses_nxdomain = 0
                cnt_dropped_ratelimit = 0
                cnt_cache_hits = 0
                cnt_cache_misses = 0
                cnt_latency_count = 0
                cnt_latency_sum_ms = 0.0

                g_current_per_ip_qps = []
                g_current_burst = []
                g_ewma_qps = []
                g_nxd_ratio = []
                g_avg_latency_ms = []
                g_cache_hit_ratio = []

                successful_instances = 0

                for inst in instances:
                    try:
                        resp = requests.get(inst["url"], timeout=0.5)
                        resp.raise_for_status()
                        data = resp.json()
                    except Exception as e:
                        print(f"[WARN] Failed to fetch {inst['url']}: {e}")
                        continue  # skip this instance for this timestamp

                    successful_instances += 1

                    # Counters (sum)
                    cnt_queries_total += data.get("queries_total", 0)
                    cnt_responses_noerror += data.get("responses_noerror", 0)
                    cnt_responses_nxdomain += data.get("responses_nxdomain", 0)
                    cnt_dropped_ratelimit += data.get("dropped_ratelimit", 0)
                    cnt_cache_hits += data.get("cache_hits", 0)
                    cnt_cache_misses += data.get("cache_misses", 0)
                    cnt_latency_count += data.get("latency_count", 0)
                    cnt_latency_sum_ms += data.get("latency_sum_ms", 0.0)

                    # Gauges (average)
                    g_current_per_ip_qps.append(data.get("current_per_ip_qps", 0.0))
                    g_current_burst.append(data.get("current_burst", 0.0))
                    g_ewma_qps.append(data.get("ewma_qps", 0.0))
                    g_nxd_ratio.append(data.get("nxd_ratio", 0.0))
                    g_avg_latency_ms.append(data.get("avg_latency_ms", 0.0))
                    g_cache_hit_ratio.append(data.get("cache_hit_ratio", 0.0))

                if successful_instances == 0:
                    # Nothing succeeded this tick; write a "missing" row
                    row = {
                        "timestamp": ts,
                        "label": args.label,
                        "instance_count": 0,
                        "queries_total_sum": -1,
                        "responses_noerror_sum": -1,
                        "responses_nxdomain_sum": -1,
                        "dropped_ratelimit_sum": -1,
                        "cache_hits_sum": -1,
                        "cache_misses_sum": -1,
                        "latency_count_sum": -1,
                        "latency_sum_ms_sum": -1.0,
                        "avg_latency_ms_avg": -1.0,
                        "cache_hit_ratio_avg": -1.0,
                        "current_per_ip_qps_avg": -1.0,
                        "current_burst_avg": -1.0,
                        "ewma_qps_avg": -1.0,
                        "nxd_ratio_avg": -1.0,
                    }
                else:
                    def avg(values):
                        return sum(values) / len(values) if values else 0.0

                    row = {
                        "timestamp": ts,
                        "label": args.label,
                        "instance_count": successful_instances,

                        "queries_total_sum": cnt_queries_total,
                        "responses_noerror_sum": cnt_responses_noerror,
                        "responses_nxdomain_sum": cnt_responses_nxdomain,
                        "dropped_ratelimit_sum": cnt_dropped_ratelimit,
                        "cache_hits_sum": cnt_cache_hits,
                        "cache_misses_sum": cnt_cache_misses,
                        "latency_count_sum": cnt_latency_count,
                        "latency_sum_ms_sum": cnt_latency_sum_ms,

                        "avg_latency_ms_avg": avg(g_avg_latency_ms),
                        "cache_hit_ratio_avg": avg(g_cache_hit_ratio),
                        "current_per_ip_qps_avg": avg(g_current_per_ip_qps),
                        "current_burst_avg": avg(g_current_burst),
                        "ewma_qps_avg": avg(g_ewma_qps),
                        "nxd_ratio_avg": avg(g_nxd_ratio),
                    }

                writer.writerow(row)

                elapsed = time.time() - now
                time.sleep(max(0.0, args.interval - elapsed))

        except KeyboardInterrupt:
            print("\nInterrupted by user, stopping collection.")


if __name__ == "__main__":
    main()
