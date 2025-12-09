# Generates legitimate background queries
#!/usr/bin/env python3
"""
Normal Traffic Generator for ECS235A DNS Guardian
Sends periodic legitimate DNS queries to keep metrics updated and simulate real-world traffic.
This runs independently of attack simulations.
"""

import socket
import argparse
import time
import random
import signal
import sys
from dnslib import DNSRecord, QTYPE


class NormalTrafficGenerator:
    def __init__(self, host: str, port: int):
        self.host = host
        self.port = port
        self.running = True
        self.queries_sent = 0
        self.responses_received = 0
        self.errors = 0
        
        # Legitimate domains that exist in the zone
        self.valid_domains = [
            "www.example.test.",
            "api.example.test.",
        ]
        
        # Query types to use
        self.query_types = ["A", "TXT"]
        
    def send_query(self, qname: str, qtype: str = "A", timeout: float = 2.0) -> bool:
        """Send a single DNS query and return success status."""
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(timeout)
        try:
            q = DNSRecord.question(qname, qtype)
            sock.sendto(q.pack(), (self.host, self.port))
            data, _ = sock.recvfrom(4096)
            response = DNSRecord.parse(data)
            return True
        except socket.timeout:
            return False
        except Exception as e:
            return False
        finally:
            sock.close()
    
    def stop(self, signum=None, frame=None):
        """Signal handler to gracefully stop the generator."""
        print(f"\n[*] Stopping traffic generator...")
        self.running = False
    
    def run(self, qps: float = 1.0, duration: int = None):
        """
        Run the traffic generator.
        
        Args:
            qps: Queries per second (can be fractional, e.g., 0.5 = 1 query every 2 seconds)
            duration: How long to run in seconds (None = run forever)
        """
        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self.stop)
        signal.signal(signal.SIGTERM, self.stop)
        
        interval = 1.0 / qps if qps > 0 else 1.0
        start_time = time.time()
        
        print(f"[*] Normal Traffic Generator Started")
        print(f"    Target: {self.host}:{self.port}")
        print(f"    Rate: {qps} QPS (1 query every {interval:.2f}s)")
        print(f"    Duration: {'Infinite (Ctrl+C to stop)' if duration is None else f'{duration}s'}")
        print(f"    Domains: {', '.join(self.valid_domains)}")
        print("-" * 50)
        
        try:
            while self.running:
                # Check duration
                if duration is not None and (time.time() - start_time) >= duration:
                    break
                
                # Pick a random valid domain and query type
                domain = random.choice(self.valid_domains)
                qtype = random.choice(self.query_types)
                
                # Send query
                self.queries_sent += 1
                success = self.send_query(domain, qtype)
                
                if success:
                    self.responses_received += 1
                    status = "OK"
                else:
                    self.errors += 1
                    status = "TIMEOUT/ERROR"
                
                # Print status occasionally (every 10 queries or on error)
                if self.queries_sent % 10 == 0 or not success:
                    elapsed = time.time() - start_time
                    print(f"[{elapsed:6.1f}s] Query #{self.queries_sent}: {domain} {qtype} -> {status}")
                
                # Wait for next interval
                time.sleep(interval)
                
        except KeyboardInterrupt:
            pass
        
        # Print summary
        elapsed = time.time() - start_time
        print("-" * 50)
        print(f"[*] Traffic Generator Stopped")
        print(f"    Duration: {elapsed:.1f}s")
        print(f"    Queries Sent: {self.queries_sent}")
        print(f"    Responses: {self.responses_received}")
        print(f"    Errors/Timeouts: {self.errors}")
        print(f"    Actual QPS: {self.queries_sent / elapsed:.2f}" if elapsed > 0 else "")


def main():
    parser = argparse.ArgumentParser(
        description="Normal Traffic Generator - Sends periodic legitimate DNS queries"
    )
    parser.add_argument(
        "--host", 
        default="127.0.0.1", 
        help="DNS server host (default: 127.0.0.1)"
    )
    parser.add_argument(
        "--port", 
        type=int, 
        default=1053, 
        help="DNS server port (default: 1053)"
    )
    parser.add_argument(
        "--qps", 
        type=float, 
        default=1.0, 
        help="Queries per second (default: 1.0, can be fractional like 0.5)"
    )
    parser.add_argument(
        "--duration", 
        type=int, 
        default=None, 
        help="Duration in seconds (default: run forever until Ctrl+C)"
    )
    
    args = parser.parse_args()
    
    generator = NormalTrafficGenerator(args.host, args.port)
    generator.run(qps=args.qps, duration=args.duration)


if __name__ == "__main__":
    main()