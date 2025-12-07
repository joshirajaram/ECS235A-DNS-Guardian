# Runs all containers and traffic simulations

#==================================================================
# How to RUN these experiments:
# 1. Baseline:
#       - In config.yaml: adaptive & ratelimit disabled
#       - docker-compose down
#       - docker-compose up -d --build
#       - python scripts/run_experiment.py --label baseline
# 1. Static mode: 
#       - disable adaptive in config.yaml
#       - docker-compose down
#       - docker-compose up -d --build
#       - python scripts/run_experiment.py --label static
# 2. Adaptive mode:
#       - enable adaptive in config.yaml
#       - docker-compose down
#       - docker-compose up -d --build
#       - python scripts/run_experiment.py --label adaptive
#==================================================================

#!/usr/bin/env python3
"""
Run a set of DNS DoS experiments (flood + burst) and collect
cluster-wide metrics for each scenario into separate CSV files.

Usage (example):

  # Static mode (adaptive disabled in config.yaml)
  python scripts/run_experiment.py --label static

  # Adaptive mode (adaptive enabled in config.yaml)
  python scripts/run_experiment.py --label adaptive

Results go under results/ by default:
  results/static_flood_q100_d30.csv
  results/static_burst_bs100_b5_i2.csv
  results/adaptive_flood_q100_d30.csv
  results/adaptive_burst_bs100_b5_i2.csv
"""

import argparse
import os
import subprocess
import time
from pathlib import Path


def parse_args():
    p = argparse.ArgumentParser(
        description="Run DNS DoS experiments (flood + burst) and collect metrics."
    )
    p.add_argument(
        "--label",
        required=True,
        help="Label for this run (e.g. 'static', 'adaptive'). "
             "Will be prefixed to scenario names.",
    )
    p.add_argument(
        "--dns-host",
        default="127.0.0.1",
        help="DNS proxy host (default: 127.0.0.1)",
    )
    p.add_argument(
        "--dns-port",
        type=int,
        default=1053,
        help="DNS proxy port (default: 1053)",
    )
    p.add_argument(
        "--metrics-host",
        default="127.0.0.1",
        help="Metrics host (default: 127.0.0.1)",
    )
    p.add_argument(
        "--metrics-ports",
        default="8000,8001,8002",
        help="Comma-separated metrics ports (default: 8000,8001,8002)",
    )
    p.add_argument(
        "--out-dir",
        default="results",
        help="Directory to store CSV outputs (default: results)",
    )

    # Flood parameters
    p.add_argument(
        "--flood-qps",
        type=int,
        default=100,
        help="Flood QPS (default: 100)",
    )
    p.add_argument(
        "--flood-duration",
        type=int,
        default=30,
        help="Flood duration in seconds (default: 30)",
    )
    p.add_argument(
        "--flood-threads",
        type=int,
        default=10,
        help="Worker threads for flood (default: 10)",
    )

    # Burst parameters
    p.add_argument(
        "--burst-size",
        type=int,
        default=100,
        help="Queries per burst (default: 100)",
    )
    p.add_argument(
        "--bursts",
        type=int,
        default=5,
        help="Number of bursts (default: 5)",
    )
    p.add_argument(
        "--burst-interval",
        type=float,
        default=2.0,
        help="Interval between bursts in seconds (default: 2.0)",
    )

    return p.parse_args()


def ensure_out_dir(path: str) -> Path:
    out_path = Path(path)
    out_path.mkdir(parents=True, exist_ok=True)
    return out_path


def run_teardown():
    """Run scripts/teardown.sh if it exists (best-effort)."""
    script = Path("scripts/teardown.sh")
    # if script.exists():
    #     print(f"[*] Running teardown.sh to clean previous containers: {script}")
    #     try:
    #         subprocess.run(["bash", str(script)], check=False)
    #     except Exception as e:
    #         print(f"[WARN] teardown.sh failed: {e}")
    # else:
    #     print("[*] teardown.sh not found, skipping teardown.")


def try_docker_compose_up():
    # Try to start cluster with rebuild
    for cmd in [["docker", "compose"], ["docker-compose"]]:
        try:
            print(f"[*] Trying to start cluster with: {' '.join(cmd + ['up', '-d', '--build'])}")
            subprocess.run(cmd + ["up", "-d"], check=True)
            #subprocess.run(cmd + ["up", "-d", "--build"], check=True)
            print("[*] Cluster rebuilt and started.")
            return
        except Exception as e:
            print(f"[WARN] '{' '.join(cmd)} up -d --build' failed: {e}")
    print("[WARN] Could not automatically start docker compose. "
          "Make sure your cluster is running.")

def run_scenario(
    label: str,
    scenario_name: str,
    dns_host: str,
    dns_port: int,
    metrics_host: str,
    metrics_ports: str,
    out_dir: Path,
    attack_args: list[str],
    collect_duration: float,
):
    """
    Run one scenario:
      - start collect_metrics.py for collect_duration seconds
      - start attack_simulator.py with attack_args
      - wait for both
    """
    run_label = f"{label}_{scenario_name}"
    out_csv = out_dir / f"{run_label}.csv"

    print("\n" + "=" * 60)
    print(f"[*] Scenario: {scenario_name}")
    print(f"    Label: {run_label}")
    print(f"    Collecting metrics for {collect_duration:.1f}s")
    print(f"    Output CSV: {out_csv}")
    print("=" * 60 + "\n")

    # Start metrics collector
    collector_cmd = [
        "python3",
        "scripts/collect_metrics.py",
        "--host",
        metrics_host,
        "--ports",
        metrics_ports,
        "--interval",
        "1.0",
        "--duration",
        str(collect_duration),
        "--label",
        run_label,
        "--out",
        str(out_csv),
    ]
    print(f"[*] Starting metrics collector:\n    {' '.join(collector_cmd)}")
    collector_proc = subprocess.Popen(collector_cmd)

    # Small delay so collector starts slightly before attack
    time.sleep(2.0)

    # Start attack simulator
    attack_cmd = [
        "python3",
        "simulator/attack_simulator.py",
        "--host",
        dns_host,
        "--port",
        str(dns_port),
    ] + attack_args

    print(f"[*] Starting attack simulator:\n    {' '.join(attack_cmd)}")
    attack_proc = subprocess.Popen(attack_cmd)

    # Wait for attack to finish, then for collector
    attack_proc.wait()
    print("[*] Attack simulator finished, waiting for collector...")
    collector_proc.wait()
    print("[*] Scenario complete.")


def main():
    args = parse_args()
    out_dir = ensure_out_dir(args.out_dir)

    # Clean previous containers before starting new run
    run_teardown()

    # Bring up the cluster
    try_docker_compose_up()

    # Define scenarios (aligned with teammate's examples)
    # 1) Flood: 100 QPS for 30 seconds
    flood_name = f"flood_q{args.flood_qps}_d{args.flood_duration}"
    flood_attack_args = [
        "--attack",
        "flood",
        "--qps",
        str(args.flood_qps),
        "--duration",
        str(args.flood_duration),
        "--threads",
        str(args.flood_threads),
    ]
    flood_collect_duration = args.flood_duration + 5

    # 2) Burst: 5 bursts of 100 queries, 2s apart
    burst_name = (
        f"burst_bs{args.burst_size}_b{args.bursts}_i{int(args.burst_interval)}"
    )
    burst_attack_args = [
        "--attack",
        "burst",
        "--burst-size",
        str(args.burst_size),
        "--bursts",
        str(args.bursts),
        "--interval",
        str(args.burst_interval),
    ]
    burst_collect_duration = args.bursts * args.burst_interval + 5

    # Run flood scenario
    run_scenario(
        label=args.label,
        scenario_name=flood_name,
        dns_host=args.dns_host,
        dns_port=args.dns_port,
        metrics_host=args.metrics_host,
        metrics_ports=args.metrics_ports,
        out_dir=out_dir,
        attack_args=flood_attack_args,
        collect_duration=flood_collect_duration,
    )

    print("\n[*] Sleeping 5s between scenarios...\n")
    time.sleep(5.0)

    # Run burst scenario
    run_scenario(
        label=args.label,
        scenario_name=burst_name,
        dns_host=args.dns_host,
        dns_port=args.dns_port,
        metrics_host=args.metrics_host,
        metrics_ports=args.metrics_ports,
        out_dir=out_dir,
        attack_args=burst_attack_args,
        collect_duration=burst_collect_duration,
    )

    print("\n[*] All scenarios finished.")
    print(f"[*] Results written under: {out_dir}\n")


if __name__ == "__main__":
    main()
