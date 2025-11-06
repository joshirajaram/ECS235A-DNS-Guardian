import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Zap,
  Shield
} from 'lucide-react';

export default function TrafficStats({ metrics }) {
  const stats = [
    {
      title: 'Total Queries',
      value: metrics.queries_total.toLocaleString(),
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Successful Responses',
      value: metrics.responses_noerror.toLocaleString(),
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-100',
      subtitle: `${((metrics.responses_noerror / metrics.queries_total) * 100).toFixed(1)}% success rate`,
    },
    {
      title: 'NXDOMAIN Responses',
      value: metrics.responses_nxdomain.toLocaleString(),
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-100',
      subtitle: `${((metrics.responses_nxdomain / metrics.queries_total) * 100).toFixed(1)}% of total`,
    },
    {
      title: 'Rate Limited',
      value: metrics.dropped_ratelimit.toLocaleString(),
      icon: Shield,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100',
      subtitle: 'Dropped queries',
    },
    {
      title: 'Current QPS',
      value: metrics.ewma_qps.toFixed(0),
      icon: Zap,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100',
      subtitle: 'Queries per second',
    },
    {
      title: 'Avg Latency',
      value: `${metrics.avg_latency_ms.toFixed(1)}ms`,
      icon: Clock,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-100',
      subtitle: metrics.avg_latency_ms > 50 ? 'High latency' : 'Normal',
    },
    {
      title: 'Cache Hit Ratio',
      value: `${(metrics.cache_hit_ratio * 100).toFixed(1)}%`,
      icon: Database,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-100',
      subtitle: 'Cache effectiveness',
    },
    {
      title: 'Per-IP Limit',
      value: `${metrics.current_per_ip_qps} QPS`,
      icon: AlertCircle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100',
      subtitle: `Burst: ${metrics.current_burst}`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold mb-1">
                    {stat.value}
                  </p>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground">
                      {stat.subtitle}
                    </p>
                  )}
                  {stat.trend && (
                    <div className={`flex items-center gap-1 mt-2 text-xs ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{stat.trend}</span>
                    </div>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
