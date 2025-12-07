# Simulate query floods, burst attacks, etc.
"""

# Query flood attack - 100 QPS for 30 seconds
python scripts/simulate_dos_attack.py --attack flood --qps 100 --duration 30

# Burst attack - 5 bursts of 100 queries each
python scripts/simulate_dos_attack.py --attack burst --burst-size 100 --bursts 5 --interval 2

"""

#!/usr/bin/env python3
"""
DoS Attack Simulator for ECS235A DNS Guardian
Simulates query flood and burst attacks to evaluate adaptive rate limiting.
"""

import socket
import argparse
import time
import random
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from dnslib import DNSRecord


class AttackStats:
    def __init__(self):
        self.queries_sent = 0
        self.responses = 0
        self.refused = 0
        self.errors = 0
        self.lock = threading.Lock()

    def update(self, success: bool, rcode: int):
        with self.lock:
            self.queries_sent += 1
            if success:
                self.responses += 1
                if rcode == 5:  # REFUSED
                    self.refused += 1
            else:
                self.errors += 1

    def print_summary(self):
        print(f"\n{'='*50}")
        print(f"Queries Sent:     {self.queries_sent}")
        print(f"Responses:        {self.responses}")
        print(f"Rate Limited:     {self.refused}")
        print(f"Errors/Timeouts:  {self.errors}")
        print(f"{'='*50}\n")


def send_query(host: str, port: int, qname: str, timeout: float = 1.0) -> tuple:
    """Send DNS query, return (success, rcode)."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(timeout)
    try:
        q = DNSRecord.question(qname, "A")
        sock.sendto(q.pack(), (host, port))
        data, _ = sock.recvfrom(4096)
        return True, DNSRecord.parse(data).header.rcode
    except:
        return False, -1
    finally:
        sock.close()


def query_flood(host: str, port: int, qps: int, duration: int, threads: int):
    """High volume query flood attack."""
    print(f"\n[*] Query Flood Attack")
    print(f"    Target: {host}:{port}, Rate: {qps} QPS, Duration: {duration}s")

    stats = AttackStats()
    domain = "example.test."
    subdomains = ["www", "api"]
    total = qps * duration
    delay = threads / qps

    def worker():
        for _ in range(total // threads):
            qname = f"{random.choice(subdomains)}.{domain}"
            success, rcode = send_query(host, port, qname)
            stats.update(success, rcode)
            time.sleep(delay)

    with ThreadPoolExecutor(max_workers=threads) as ex:
        futures = [ex.submit(worker) for _ in range(threads)]
        for f in as_completed(futures):
            f.result()

    stats.print_summary()


def burst_attack(host: str, port: int, burst_size: int, bursts: int, interval: float):
    """Sudden traffic spike attack."""
    print(f"\n[*] Burst Attack")
    print(f"    Target: {host}:{port}, Burst: {burst_size} queries, Bursts: {bursts}")

    stats = AttackStats()
    domain = "example.test."

    for i in range(bursts):
        print(f"    Burst {i+1}/{bursts}...")

        def send(_):
            success, rcode = send_query(host, port, f"www.{domain}")
            stats.update(success, rcode)

        with ThreadPoolExecutor(max_workers=min(burst_size, 100)) as ex:
            list(ex.map(send, range(burst_size)))

        if i < bursts - 1:
            time.sleep(interval)

    stats.print_summary()


def main():
    parser = argparse.ArgumentParser(description="DNS DoS Attack Simulator")
    parser.add_argument("--host", default="127.0.0.1", help="Target host")
    parser.add_argument("--port", type=int, default=1053, help="Target port")
    parser.add_argument("--attack", required=True, choices=["flood", "burst"])
    parser.add_argument("--qps", type=int, default=100, help="Queries/sec (flood)")
    parser.add_argument("--duration", type=int, default=30, help="Duration in seconds")
    parser.add_argument("--threads", type=int, default=10, help="Worker threads")
    parser.add_argument("--burst-size", type=int, default=100, help="Queries per burst")
    parser.add_argument("--bursts", type=int, default=5, help="Number of bursts")
    parser.add_argument("--interval", type=float, default=2.0, help="Interval between bursts")

    args = parser.parse_args()

    print("=" * 50)
    print("  DNS DoS Attack Simulator")
    print("=" * 50)

    start = time.time()

    if args.attack == "flood":
        query_flood(args.host, args.port, args.qps, args.duration, args.threads)
    else:
        burst_attack(args.host, args.port, args.burst_size, args.bursts, args.interval)

    print(f"[*] Completed in {time.time() - start:.2f}s")


if __name__ == "__main__":
    main()
