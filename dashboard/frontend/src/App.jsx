import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import TrafficStats from './components/TrafficStats';
import ReplicaStatus from './components/ReplicaStatus';
import {
  QueryRateChart,
  NXDomainRatioChart,
  DroppedRequestsChart,
  LatencyChart,
  CacheHitRatioChart,
} from './components/Charts';
import { fetchCurrentMetrics, fetchHistoricalData, checkConnection } from './lib/prometheus';
import { generateMockMetrics, generateHistoricalData as generateMockHistoricalData } from './lib/mockData';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  Server,
  Activity,
  RefreshCw,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';

// Time range options in minutes
const TIME_RANGE_OPTIONS = [
  { label: '1m', value: 1 },
  { label: '5m', value: 5 },
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
];

function App() {
  const [metrics, setMetrics] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState(5); // Default 5 minutes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useMockData, setUseMockData] = useState(false);

  // Fetch data from Prometheus
  const fetchData = useCallback(async () => {
    try {
      const [metricsData, histData] = await Promise.all([
        fetchCurrentMetrics(),
        fetchHistoricalData(timeRange),
      ]);
      
      setMetrics(metricsData);
      setHistoricalData(histData.length > 0 ? histData : []);
      setIsConnected(true);
      setError(null);
      setUseMockData(false);
    } catch (err) {
      console.error('Failed to fetch from Prometheus:', err);
      setError(err.message);
      setIsConnected(false);
      
      // Fall back to mock data
      if (!metrics) {
        setMetrics(generateMockMetrics());
        setHistoricalData(generateMockHistoricalData(30));
        setUseMockData(true);
      }
    } finally {
      setLoading(false);
    }
  }, [timeRange, metrics]);

  // Check connection on mount
  useEffect(() => {
    const init = async () => {
      const connected = await checkConnection();
      setIsConnected(connected);
      if (connected) {
        await fetchData();
      } else {
        // Use mock data if Prometheus is not available
        setMetrics(generateMockMetrics());
        setHistoricalData(generateMockHistoricalData(30));
        setUseMockData(true);
        setLoading(false);
      }
    };
    init();
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Refetch when time range changes
  useEffect(() => {
    if (isConnected) {
      fetchData();
    }
  }, [timeRange]);

  const getSystemStatus = () => {
    if (!isConnected && !useMockData) {
      return {
        status: 'disconnected',
        label: 'Disconnected',
        icon: ShieldAlert,
        color: 'text-gray-500',
        badgeVariant: 'secondary',
      };
    }
    
    if (metrics?.under_attack) {
      return {
        status: 'under_attack',
        label: 'Under Attack',
        icon: ShieldAlert,
        color: 'text-red-500',
        badgeVariant: 'destructive',
      };
    }
    
    if (metrics && (metrics.ewma_qps > 2000 || metrics.dropped_ratelimit > 500)) {
      return {
        status: 'warning',
        label: 'High Load',
        icon: AlertTriangle,
        color: 'text-yellow-500',
        badgeVariant: 'warning',
      };
    }
    
    return {
      status: 'healthy',
      label: 'Operational',
      icon: ShieldCheck,
      color: 'text-green-500',
      badgeVariant: 'success',
    };
  };

  const systemStatus = getSystemStatus();
  const StatusIcon = systemStatus.icon;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Connecting to Prometheus...</p>
        </div>
      </div>
    );
  }

  // Use default values if metrics is null
  const displayMetrics = metrics || {
    queries_total: 0,
    responses_noerror: 0,
    responses_nxdomain: 0,
    dropped_ratelimit: 0,
    ewma_qps: 0,
    current_per_ip_qps: 0,
    current_burst: 0,
    avg_latency_ms: 0,
    cache_hit_ratio: 0,
    under_attack: false,
    adaptive_enabled: true,
    replicas: [],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">DNS Guardian</h1>
                <p className="text-sm text-slate-600">DoS Protection & Adaptive Rate Limiting</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                isConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                {isConnected ? 'Prometheus Connected' : 'Using Mock Data'}
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                <Clock className="w-4 h-4 text-slate-500 ml-2" />
                {TIME_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTimeRange(option.value)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      timeRange === option.value
                        ? 'bg-white text-blue-600 shadow-sm font-medium'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  autoRefresh 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Live' : 'Paused'}
              </button>
              
              <Badge variant={systemStatus.badgeVariant} className="flex items-center gap-2 px-4 py-2 text-sm">
                <StatusIcon className="w-4 h-4" />
                {systemStatus.label}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Error Banner */}
        {error && !useMockData && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">Connection Issue</h3>
              <p className="text-sm text-yellow-700">{error}</p>
            </div>
          </div>
        )}

        {/* Alert Banner */}
        {displayMetrics.under_attack && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-pulse-slow">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">DoS Attack Detected</h3>
              <p className="text-sm text-red-700">
                Adaptive rate limiting is active. High NXDOMAIN ratio detected ({((displayMetrics.responses_nxdomain / displayMetrics.queries_total) * 100).toFixed(1)}%).
                Current per-IP limit: {displayMetrics.current_per_ip_qps} QPS.
              </p>
            </div>
          </div>
        )}

        {/* System Overview Cards */}
        <div className="mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>System Overview</CardTitle>
                    <CardDescription>Real-time DNS server metrics and performance</CardDescription>
                  </div>
                  <Server className="w-8 h-8 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Configuration</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Adaptive Rate Limiting:</span>
                        <Badge variant={displayMetrics.adaptive_enabled ? 'success' : 'secondary'}>
                          {displayMetrics.adaptive_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current QPS Limit:</span>
                        <span className="font-medium">{displayMetrics.current_per_ip_qps}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Burst Capacity:</span>
                        <span className="font-medium">{displayMetrics.current_burst}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Active Replicas:</span>
                        <span className="font-medium">{displayMetrics.replicas.length}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Performance Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Success Rate:</span>
                        <span className="font-medium text-green-600">
                          {displayMetrics.queries_total > 0 ? ((displayMetrics.responses_noerror / displayMetrics.queries_total) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Error Rate:</span>
                        <span className={`font-medium ${
                          displayMetrics.queries_total > 0 && (displayMetrics.responses_nxdomain / displayMetrics.queries_total) > 0.3 ? 'text-red-600' : 'text-slate-600'
                        }`}>
                          {displayMetrics.queries_total > 0 ? ((displayMetrics.responses_nxdomain / displayMetrics.queries_total) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Drop Rate:</span>
                        <span className="font-medium text-orange-600">
                          {displayMetrics.queries_total > 0 ? ((displayMetrics.dropped_ratelimit / displayMetrics.queries_total) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Latency:</span>
                        <span className={`font-medium ${
                          displayMetrics.avg_latency_ms > 50 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {displayMetrics.avg_latency_ms.toFixed(1)}ms
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Live Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className={`inline-flex p-4 rounded-full ${
                      displayMetrics.under_attack ? 'bg-red-100' : 'bg-green-100'
                    } mb-3`}>
                      <StatusIcon className={`w-12 h-12 ${systemStatus.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{systemStatus.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {displayMetrics.under_attack 
                        ? 'Mitigating DoS attack with adaptive limits'
                        : 'All systems running normally'
                      }
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="text-xs text-muted-foreground mb-2">Quick Stats</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-50 p-3 rounded">
                        <div className="text-xs text-muted-foreground mb-1">Total Queries</div>
                        <div className="font-bold text-blue-600">{displayMetrics.queries_total.toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded">
                        <div className="text-xs text-muted-foreground mb-1">Blocked</div>
                        <div className="font-bold text-orange-600">{displayMetrics.dropped_ratelimit.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Traffic Statistics */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Traffic Statistics</h2>
          <TrafficStats metrics={displayMetrics} />
        </div>

        {/* Charts */}
        <div className="space-y-6 mb-6">
          <h2 className="text-xl font-semibold">Real-Time Analytics</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QueryRateChart data={historicalData} />
            <NXDomainRatioChart data={historicalData} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DroppedRequestsChart data={historicalData} />
            <LatencyChart data={historicalData} />
          </div>
          
          <CacheHitRatioChart data={historicalData} />
        </div>

        {/* Replica Status */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Server Replicas</h2>
          <ReplicaStatus replicas={displayMetrics.replicas} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-6">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>DNS Guardian - ECS 235A Project</p>
            <p>Research: Adaptive Rate Limiting vs Static DoS Mitigation</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
