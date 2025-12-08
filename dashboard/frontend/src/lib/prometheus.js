// Prometheus API client for fetching DNS metrics

const PROMETHEUS_URL = import.meta.env.VITE_PROMETHEUS_URL || 'http://localhost:9090';

/**
 * Query Prometheus instant query API
 */
export async function queryInstant(query) {
  const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Prometheus query failed: ${response.statusText}`);
  }
  const data = await response.json();
  if (data.status !== 'success') {
    throw new Error(`Prometheus query error: ${data.error}`);
  }
  return data.data.result;
}

/**
 * Query Prometheus range query API
 */
export async function queryRange(query, startTime, endTime, step = '5s') {
  const url = `${PROMETHEUS_URL}/api/v1/query_range?query=${encodeURIComponent(query)}&start=${startTime}&end=${endTime}&step=${step}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Prometheus range query failed: ${response.statusText}`);
  }
  const data = await response.json();
  if (data.status !== 'success') {
    throw new Error(`Prometheus query error: ${data.error}`);
  }
  return data.data.result;
}

/**
 * Get time range parameters
 */
export function getTimeRange(minutes = 5) {
  const now = Math.floor(Date.now() / 1000);
  const start = now - minutes * 60;
  return { start, end: now };
}

/**
 * Calculate step based on time range for optimal data points
 */
export function calculateStep(minutes) {
  if (minutes <= 5) return '5s';
  if (minutes <= 15) return '10s';
  if (minutes <= 30) return '15s';
  if (minutes <= 60) return '30s';
  return '60s';
}

// PromQL Queries for each metric
export const QUERIES = {
  // Aggregate queries (sum across all replicas)
  queriesTotal: 'sum(dns_queries_total)',
  responsesNoerror: 'sum(dns_responses_noerror)',
  responsesNxdomain: 'sum(dns_responses_nxdomain)',
  droppedRatelimit: 'sum(dns_dropped_ratelimit)',
  cacheHits: 'sum(dns_cache_hits)',
  cacheMisses: 'sum(dns_cache_misses)',
  
  // Rate queries (per second)
  queryRate: 'sum(rate(dns_queries_total[30s]))',
  nxdomainRate: 'sum(rate(dns_responses_nxdomain[30s]))',
  droppedRate: 'sum(rate(dns_dropped_ratelimit[30s]))',
  
  // Ratio queries
  nxdomainRatio: 'sum(dns_responses_nxdomain) / sum(dns_queries_total)',
  cacheHitRatio: 'sum(dns_cache_hits) / (sum(dns_cache_hits) + sum(dns_cache_misses))',
  
  // Gauge metrics (avg across replicas)
  ewmaQps: 'avg(dns_ewma_qps)',
  currentPerIpQps: 'avg(dns_current_per_ip_qps)',
  currentBurst: 'avg(dns_current_burst)',
  avgLatencyMs: 'avg(dns_avg_latency_ms)',
  
  // Per-replica queries
  queriesPerReplica: 'dns_queries_total',
  droppedPerReplica: 'dns_dropped_ratelimit',
  ewmaQpsPerReplica: 'dns_ewma_qps',
};

/**
 * Fetch current metrics snapshot
 */
export async function fetchCurrentMetrics() {
  try {
    const [
      queriesTotal,
      responsesNoerror,
      responsesNxdomain,
      droppedRatelimit,
      cacheHits,
      cacheMisses,
      ewmaQps,
      currentPerIpQps,
      currentBurst,
      avgLatencyMs,
      replicaData,
    ] = await Promise.all([
      queryInstant(QUERIES.queriesTotal),
      queryInstant(QUERIES.responsesNoerror),
      queryInstant(QUERIES.responsesNxdomain),
      queryInstant(QUERIES.droppedRatelimit),
      queryInstant(QUERIES.cacheHits),
      queryInstant(QUERIES.cacheMisses),
      queryInstant(QUERIES.ewmaQps),
      queryInstant(QUERIES.currentPerIpQps),
      queryInstant(QUERIES.currentBurst),
      queryInstant(QUERIES.avgLatencyMs),
      queryInstant(QUERIES.queriesPerReplica),
    ]);

    const getValue = (result) => {
      if (!result || result.length === 0) return 0;
      return parseFloat(result[0].value[1]) || 0;
    };

    const queries_total = getValue(queriesTotal);
    const responses_noerror = getValue(responsesNoerror);
    const responses_nxdomain = getValue(responsesNxdomain);
    const cache_hits = getValue(cacheHits);
    const cache_misses = getValue(cacheMisses);

    // Build replica status
    const replicas = replicaData.map((r) => ({
      id: r.metric.replica || r.metric.job || 'unknown',
      name: r.metric.replica || r.metric.instance || 'DNS Server',
      status: 'healthy',
      queries: parseInt(r.value[1]) || 0,
      health: 100,
    }));

    return {
      queries_total,
      responses_noerror,
      responses_nxdomain,
      dropped_ratelimit: getValue(droppedRatelimit),
      cache_hits,
      cache_misses,
      ewma_qps: getValue(ewmaQps),
      current_per_ip_qps: getValue(currentPerIpQps),
      current_burst: getValue(currentBurst),
      avg_latency_ms: getValue(avgLatencyMs),
      cache_hit_ratio: cache_hits + cache_misses > 0 
        ? cache_hits / (cache_hits + cache_misses) 
        : 0,
      nxd_ratio: queries_total > 0 
        ? responses_nxdomain / queries_total 
        : 0,
      under_attack: queries_total > 0 && (responses_nxdomain / queries_total) > 0.3,
      adaptive_enabled: true,
      replicas: replicas.length > 0 ? replicas : [
        { id: 'dns1', name: 'DNS Server 1', status: 'healthy', queries: 0, health: 100 },
        { id: 'dns2', name: 'DNS Server 2', status: 'healthy', queries: 0, health: 100 },
        { id: 'dns3', name: 'DNS Server 3', status: 'healthy', queries: 0, health: 100 },
      ],
    };
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  }
}

/**
 * Fetch historical data for charts
 */
export async function fetchHistoricalData(minutes = 5) {
  const { start, end } = getTimeRange(minutes);
  const step = calculateStep(minutes);

  try {
    const [
      qpsData,
      nxdomainRatioData,
      droppedData,
      latencyData,
      cacheHitData,
    ] = await Promise.all([
      queryRange(QUERIES.ewmaQps, start, end, step),
      queryRange(QUERIES.nxdomainRatio, start, end, step),
      queryRange('sum(rate(dns_dropped_ratelimit[30s]))', start, end, step),
      queryRange(QUERIES.avgLatencyMs, start, end, step),
      queryRange(QUERIES.cacheHitRatio, start, end, step),
    ]);

    // Get the longest result set to use as base timeline
    const getValues = (result) => {
      if (!result || result.length === 0) return [];
      return result[0].values || [];
    };

    const qpsValues = getValues(qpsData);
    const nxdomainValues = getValues(nxdomainRatioData);
    const droppedValues = getValues(droppedData);
    const latencyValues = getValues(latencyData);
    const cacheHitValues = getValues(cacheHitData);

    // Use QPS timestamps as base, map other values
    const createValueMap = (values) => {
      const map = new Map();
      values.forEach(([ts, val]) => map.set(ts, parseFloat(val) || 0));
      return map;
    };

    const nxdomainMap = createValueMap(nxdomainValues);
    const droppedMap = createValueMap(droppedValues);
    const latencyMap = createValueMap(latencyValues);
    const cacheHitMap = createValueMap(cacheHitValues);

    // Build unified dataset
    const historicalData = qpsValues.map(([timestamp, qpsVal]) => ({
      timestamp: timestamp * 1000,
      time: new Date(timestamp * 1000).toLocaleTimeString(),
      qps: parseFloat(qpsVal) || 0,
      nxdomain_ratio: nxdomainMap.get(timestamp) || 0,
      dropped: droppedMap.get(timestamp) || 0,
      latency: latencyMap.get(timestamp) || 0,
      cache_hit: cacheHitMap.get(timestamp) || 0,
    }));

    return historicalData;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    throw error;
  }
}

/**
 * Check Prometheus connection status
 */
export async function checkConnection() {
  try {
    const response = await fetch(`${PROMETHEUS_URL}/api/v1/status/runtimeinfo`);
    return response.ok;
  } catch {
    return false;
  }
}
