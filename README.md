# ECS235A-DNS-Guardian
Adaptive Rate-Limiting and Attack-Aware DNS Replication for Resilient Name Resolution

## How to Run

### Backend (DNS Server)

1. Go to the project root directory
2. Activate virtual environment:
   ```bash
   # Windows
   ./cis_proj/Scripts/Activate.ps1
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. Install Python dependencies:
   ```bash
   pip install dnslib pyyaml fastapi uvicorn
   ```

4. Run the DNS server:
   ```bash
   python -m dns_server.server
   ```

You should see:
```
DNS server listening on 0.0.0.0:1053 (origin example.test.)
Metrics at http://0.0.0.0:8000/metrics
```

5. Test the DNS server:
   ```bash
   # Query A record
   dig @127.0.0.1 -p 1053 www.example.test A
   
   # Query TXT record
   dig @127.0.0.1 -p 1053 text.example.test TXT
   
   # Using nslookup
   nslookup -port=1053 www.example.test 127.0.0.1
   ```

### Frontend (Dashboard)

1. Navigate to the frontend directory:
   ```bash
   cd dashboard/frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to [http://localhost:5173](http://localhost:5173)

The dashboard provides:
- Real-time DNS metrics visualization
- DoS attack detection indicators
- Server replica monitoring
- Interactive charts for query rates, latency, cache hits, etc.

**Note:** The frontend currently uses mock data. To connect to the real DNS server metrics endpoint (`http://127.0.0.1:8000/metrics`), update the API calls in `src/App.jsx`.
