import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * Generic data fetching hook with loading, error, and refresh
 */
export function useFetch(endpoint, params = {}, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(endpoint, { params });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [endpoint, JSON.stringify(params)]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...deps]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for dashboard stats with auto-polling
 */
export function useDashboardStats(pollInterval = 30000) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        api.get('/farms/stats/overview'),
        api.get('/alerts', { params: { status: 'active' } }),
      ]);
      setStats({
        ...statsRes.data.stats,
        criticalAlerts: alertsRes.data.alerts.filter(a => a.severity === 'critical').length,
      });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, pollInterval);
    return () => clearInterval(interval);
  }, [fetchStats, pollInterval]);

  return { stats, loading, error, refetch: fetchStats };
}
