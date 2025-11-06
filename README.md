# ECS235A-DNS-Guardian
Adaptive Rate-Limiting and Attack-Aware DNS Replication for Resilient Name Resolution

How to RUN? (need to finetune later)

1. Go to the project root dir.
2. Activate virtual env:
    ./cis_proj/Scripts/Activate.ps1
3. run:
    python -m dns_server.server

You should see server running like:
    DNS server listening on 0.0.0.0:1053 (origin example.test.)
    Metrics at http://0.0.0.0:8000/metrics
