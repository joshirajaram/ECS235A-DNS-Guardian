import React, { useState, useEffect } from 'react';
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
import { generateMockMetrics, generateHistoricalData } from './lib/mockData';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  Server,
  Activity,
  RefreshCw
} from 'lucide-react';

function App() {
  const [metrics, setMetrics] = useState(generateMockMetrics());
  const [historicalData, setHistoricalData] = useState(generateHistoricalData(30));
  const [isConnected, setIsConnected] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      const newMetrics = generateMockMetrics();
      setMetrics(newMetrics);
      
      // Update historical data
      setHistoricalData(prev => {
        const newData = [...prev.slice(1)];
        const lastTimestamp = prev[prev.length - 1].timestamp;
        const newTimestamp = lastTimestamp + 2000;
        
        newData.push({
          timestamp: newTimestamp,
          time: new Date(newTimestamp).toLocaleTimeString(),
          qps: newMetrics.ewma_qps,
          nxdomain_ratio: newMetrics.responses_nxdomain / newMetrics.queries_total,
          dropped: newMetrics.dropped_ratelimit,
          latency: newMetrics.avg_latency_ms,
          cache_hit: newMetrics.cache_hit_ratio,
        });
        
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getSystemStatus = () => {
    if (!isConnected) {
      return {
        status: 'disconnected',
        label: 'Disconnected',
        icon: ShieldAlert,
        color: 'text-gray-500',
        badgeVariant: 'secondary',
      };
    }
    
    if (metrics.under_attack) {
      return {
        status: 'under_attack',
        label: 'Under Attack',
        icon: ShieldAlert,
        color: 'text-red-500',
        badgeVariant: 'destructive',
      };
    }
    
    if (metrics.ewma_qps > 2000 || metrics.dropped_ratelimit > 500) {
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
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  autoRefresh 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
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
        {/* Alert Banner */}
        {metrics.under_attack && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-pulse-slow">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">DoS Attack Detected</h3>
              <p className="text-sm text-red-700">
                Adaptive rate limiting is active. High NXDOMAIN ratio detected ({((metrics.responses_nxdomain / metrics.queries_total) * 100).toFixed(1)}%).
                Current per-IP limit: {metrics.current_per_ip_qps} QPS.
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
                        <Badge variant={metrics.adaptive_enabled ? 'success' : 'secondary'}>
                          {metrics.adaptive_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current QPS Limit:</span>
                        <span className="font-medium">{metrics.current_per_ip_qps}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Burst Capacity:</span>
                        <span className="font-medium">{metrics.current_burst}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Active Replicas:</span>
                        <span className="font-medium">{metrics.replicas.length}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Performance Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Success Rate:</span>
                        <span className="font-medium text-green-600">
                          {((metrics.responses_noerror / metrics.queries_total) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Error Rate:</span>
                        <span className={`font-medium ${
                          (metrics.responses_nxdomain / metrics.queries_total) > 0.3 ? 'text-red-600' : 'text-slate-600'
                        }`}>
                          {((metrics.responses_nxdomain / metrics.queries_total) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Drop Rate:</span>
                        <span className="font-medium text-orange-600">
                          {((metrics.dropped_ratelimit / metrics.queries_total) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Latency:</span>
                        <span className={`font-medium ${
                          metrics.avg_latency_ms > 50 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {metrics.avg_latency_ms.toFixed(1)}ms
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
                      metrics.under_attack ? 'bg-red-100' : 'bg-green-100'
                    } mb-3`}>
                      <StatusIcon className={`w-12 h-12 ${systemStatus.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{systemStatus.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {metrics.under_attack 
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
                        <div className="font-bold text-blue-600">{metrics.queries_total.toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded">
                        <div className="text-xs text-muted-foreground mb-1">Blocked</div>
                        <div className="font-bold text-orange-600">{metrics.dropped_ratelimit.toLocaleString()}</div>
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
          <TrafficStats metrics={metrics} />
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
          <ReplicaStatus replicas={metrics.replicas} />
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
