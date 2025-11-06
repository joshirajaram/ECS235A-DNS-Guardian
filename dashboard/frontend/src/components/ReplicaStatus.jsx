import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function ReplicaStatus({ replicas }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'unhealthy':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4" />;
      case 'unhealthy':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">DNS Server Replicas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {replicas.map((replica) => (
            <div
              key={replica.id}
              className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{replica.id}</span>
                  <Badge variant={getStatusColor(replica.status)} className="flex items-center gap-1">
                    {getStatusIcon(replica.status)}
                    {replica.status}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {replica.queries_handled.toLocaleString()} queries
                </span>
              </div>
              
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>CPU Usage</span>
                    <span className="font-medium">{replica.cpu_usage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        replica.cpu_usage > 70 ? 'bg-destructive' : 
                        replica.cpu_usage > 50 ? 'bg-yellow-500' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(replica.cpu_usage, 100)}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Memory Usage</span>
                    <span className="font-medium">{replica.memory_usage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        replica.memory_usage > 70 ? 'bg-destructive' : 
                        replica.memory_usage > 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(replica.memory_usage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
