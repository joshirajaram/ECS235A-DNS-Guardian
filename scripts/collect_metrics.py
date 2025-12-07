# Aggregates metrics for comparison

#!/usr/bin/env python3
"""
Collect DNS server metrics from one or more /metrics endpoints
and write them to a CSV file for later analysis.

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


def parse_args():
    p = argparse.ArgumentParser(
        description="Poll /metrics from DNS replicas and store time-series CSV."
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
        help="Comma-separated list of instance names matching ports "
             "(e.g. dns1,dns2,dns3). If omitted, names will be dns1,dns2,...",
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

    print("Collecting metrics from:")
    for inst in instances:
        print(f"  {inst['name']}: {inst['url']}")
    print(f"Writing CSV to: {args.out}")
    print(f"Run label: {args.label}")
    print(f"Interval: {args.interval}s, Duration: {args.duration}s")
    print("Press Ctrl+C to stop.\n")

    fieldnames = [
        "timestamp",
        "label",
        "instance",
        "queries_total",
        "responses_noerror",
        "responses_nxdomain",
        "dropped_ratelimit",
        "current_per_ip_qps",
        "current_burst",
        "ewma_qps",
        "nxd_ratio",
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

                for inst in instances:
                    try:
                        resp = requests.get(inst["url"], timeout=0.5)
                        resp.raise_for_status()
                        data = resp.json()
                    except Exception as e:
                        print(f"[WARN] Failed to fetch {inst['url']}: {e}")
                        row = {
                            "timestamp": ts,
                            "label": args.label,
                            "instance": inst["name"],
                            "queries_total": -1,
                            "responses_noerror": -1,
                            "responses_nxdomain": -1,
                            "dropped_ratelimit": -1,
                            "current_per_ip_qps": -1,
                            "current_burst": -1,
                            "ewma_qps": -1.0,
                            "nxd_ratio": -1.0,
                        }
                        writer.writerow(row)
                        continue

                    row = {
                        "timestamp": ts,
                        "label": args.label,
                        "instance": inst["name"],
                        "queries_total": data.get("queries_total", 0),
                        "responses_noerror": data.get("responses_noerror", 0),
                        "responses_nxdomain": data.get("responses_nxdomain", 0),
                        "dropped_ratelimit": data.get("dropped_ratelimit", 0),
                        "current_per_ip_qps": data.get("current_per_ip_qps", 0),
                        "current_burst": data.get("current_burst", 0),
                        "ewma_qps": data.get("ewma_qps", 0.0),
                        "nxd_ratio": data.get("nxd_ratio", 0.0),
                    }
                    writer.writerow(row)

                elapsed = time.time() - now
                time.sleep(max(0.0, args.interval - elapsed))

        except KeyboardInterrupt:
            print("\nInterrupted by user, stopping collection.")


if __name__ == "__main__":
    main()

