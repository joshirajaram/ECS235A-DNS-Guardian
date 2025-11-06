// Mock data generator for DNS metrics
export const generateMockMetrics = () => {
  const now = Date.now();
  const isUnderAttack = Math.random() > 0.7; // 30% chance of attack simulation
  
  return {
    timestamp: now,
    queries_total: Math.floor(Math.random() * 10000) + 5000,
    responses_noerror: Math.floor(Math.random() * 8000) + 4000,
    responses_nxdomain: isUnderAttack 
      ? Math.floor(Math.random() * 3000) + 1000 
      : Math.floor(Math.random() * 500),
    dropped_ratelimit: isUnderAttack 
      ? Math.floor(Math.random() * 2000) + 500 
      : Math.floor(Math.random() * 100),
    current_per_ip_qps: isUnderAttack 
      ? Math.floor(Math.random() * 30) + 20 
      : Math.floor(Math.random() * 40) + 10,
    current_burst: Math.floor(Math.random() * 100) + 50,
    ewma_qps: isUnderAttack 
      ? Math.random() * 3000 + 2000 
      : Math.random() * 1500 + 500,
    adaptive_enabled: true,
    under_attack: isUnderAttack,
    cache_hit_ratio: Math.random() * 0.3 + 0.6,
    avg_latency_ms: isUnderAttack 
      ? Math.random() * 100 + 50 
      : Math.random() * 30 + 10,
    replicas: [
      {
        id: 'replica-1',
        status: 'healthy',
        queries_handled: Math.floor(Math.random() * 3000) + 1000,
        cpu_usage: Math.random() * 40 + 20,
        memory_usage: Math.random() * 50 + 30,
      },
      {
        id: 'replica-2',
        status: isUnderAttack ? 'degraded' : 'healthy',
        queries_handled: Math.floor(Math.random() * 3000) + 1000,
        cpu_usage: isUnderAttack ? Math.random() * 60 + 40 : Math.random() * 40 + 20,
        memory_usage: Math.random() * 50 + 30,
      },
      {
        id: 'replica-3',
        status: 'healthy',
        queries_handled: Math.floor(Math.random() * 3000) + 1000,
        cpu_usage: Math.random() * 40 + 20,
        memory_usage: Math.random() * 50 + 30,
      },
    ],
  };
};

export const generateHistoricalData = (points = 30) => {
  const data = [];
  const now = Date.now();
  
  for (let i = points - 1; i >= 0; i--) {
    const timestamp = now - (i * 2000); // 2 second intervals
    const isAttackPeriod = i < 10; // Last 10 points show attack
    
    data.push({
      timestamp,
      time: new Date(timestamp).toLocaleTimeString(),
      qps: isAttackPeriod 
        ? Math.random() * 1000 + 2500 
        : Math.random() * 800 + 1000,
      nxdomain_ratio: isAttackPeriod 
        ? Math.random() * 0.3 + 0.25 
        : Math.random() * 0.1 + 0.05,
      dropped: isAttackPeriod 
        ? Math.floor(Math.random() * 500) + 200 
        : Math.floor(Math.random() * 50),
      latency: isAttackPeriod 
        ? Math.random() * 80 + 40 
        : Math.random() * 25 + 10,
      cache_hit: Math.random() * 0.25 + 0.65,
    });
  }
  
  return data;
};
