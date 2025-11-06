# DNS Guardian Dashboard

An intuitive React + Vite dashboard for monitoring DNS server performance, DoS attack detection, and adaptive rate limiting metrics.

## Features

- 🎯 **Real-time Metrics**: Live monitoring of DNS queries, responses, and system performance
- 🛡️ **Attack Detection**: Visual indicators for DoS attacks with adaptive rate limiting status
- 📊 **Interactive Charts**: Historical data visualization using Recharts
- 🔄 **Auto-refresh**: Configurable real-time updates
- 💻 **Replica Monitoring**: Track health and performance of multiple DNS server instances
- 🎨 **Modern UI**: Built with Tailwind CSS and custom components

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd dashboard/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to [http://localhost:5173](http://localhost:5173)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/          # Reusable UI components (Card, Badge)
│   │   ├── Charts.jsx   # Chart components for data visualization
│   │   ├── ReplicaStatus.jsx  # Server replica monitoring
│   │   └── TrafficStats.jsx   # Traffic statistics cards
│   ├── lib/
│   │   ├── mockData.js  # Mock data generators
│   │   └── utils.js     # Utility functions
│   ├── App.jsx          # Main dashboard component
│   ├── main.jsx         # Application entry point
│   └── index.css        # Global styles with Tailwind
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Dashboard Sections

### System Overview
- Configuration status (adaptive rate limiting, QPS limits, burst capacity)
- Performance metrics (success rate, error rate, latency)
- Live system status with visual indicators

### Traffic Statistics
- Total queries, successful responses, NXDOMAIN responses
- Rate-limited requests, current QPS, average latency
- Cache hit ratio, per-IP limits

### Real-Time Analytics
- **Query Rate Chart**: Queries per second over time
- **NXDOMAIN Ratio Chart**: Attack indicator based on failed DNS queries
- **Rate Limited Requests**: Dropped queries due to rate limiting
- **Response Latency**: Average response time
- **Cache Hit Ratio**: DNS cache effectiveness

### Server Replicas
- Individual replica health status
- CPU and memory usage per replica
- Queries handled by each instance

## Mock Data

The dashboard currently uses mock data generated in `src/lib/mockData.js`. This simulates:
- Random DoS attack scenarios (30% probability)
- Varying query rates and response types
- Realistic server replica metrics
- Historical data for charts

To connect to your real DNS server backend:
1. Replace mock data calls in `App.jsx` with API calls to your metrics endpoint
2. Update the data structure to match your server's response format
3. Implement WebSocket connection for real-time updates (optional)

## Customization

### Colors and Styling
Edit `tailwind.config.js` and `src/index.css` to customize the theme.

### Metrics
Modify `src/lib/mockData.js` to adjust mock data or connect to your backend API.

### Charts
Update chart configurations in `src/components/Charts.jsx` to change visualization styles.

## Research Context

This dashboard is part of an ECS 235A project researching:
> How adaptive rate-limiting and heuristic-based anomaly detection improve DNS service resistance to denial-of-service (DoS) attacks compared to static mitigation techniques.

The visualization helps analyze:
- Effectiveness of adaptive vs static rate limiting
- Attack detection accuracy using NXDOMAIN ratios
- System performance under various load conditions
- Query distribution across server replicas

## Technologies

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Chart library
- **Lucide React** - Icon library

## License

Part of ECS235A DNS Guardian Project
