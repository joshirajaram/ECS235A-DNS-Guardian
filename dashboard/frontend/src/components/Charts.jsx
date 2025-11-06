import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export function QueryRateChart({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Query Rate Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorQps" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              stroke="#888888"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#888888"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="qps" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorQps)" 
              name="Queries/sec"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function NXDomainRatioChart({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">NXDOMAIN Ratio (Attack Indicator)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              stroke="#888888"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#888888"
              domain={[0, 0.5]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
              formatter={(value) => `${(value * 100).toFixed(2)}%`}
            />
            <Line 
              type="monotone" 
              dataKey="nxdomain_ratio" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="NXDOMAIN Ratio"
            />
            <Line
              y={0.3}
              stroke="#fbbf24"
              strokeDasharray="5 5"
              name="Threshold"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DroppedRequestsChart({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Rate Limited Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              stroke="#888888"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#888888"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Bar 
              dataKey="dropped" 
              fill="#f97316" 
              name="Dropped Queries"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function LatencyChart({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Response Latency</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              stroke="#888888"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#888888"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
              formatter={(value) => `${value.toFixed(2)} ms`}
            />
            <Area 
              type="monotone" 
              dataKey="latency" 
              stroke="#10b981" 
              fillOpacity={1} 
              fill="url(#colorLatency)" 
              name="Avg Latency (ms)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CacheHitRatioChart({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cache Hit Ratio</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              stroke="#888888"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#888888"
              domain={[0, 1]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
              formatter={(value) => `${(value * 100).toFixed(2)}%`}
            />
            <Line 
              type="monotone" 
              dataKey="cache_hit" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Cache Hit Ratio"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
