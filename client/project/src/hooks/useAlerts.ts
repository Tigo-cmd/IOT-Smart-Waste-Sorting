import { useState, useEffect } from 'react';
import { Alert } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${API_URL}/alerts`);
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      setAlerts(data as Alert[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (id: string) => {
    try {
      await fetch(`${API_URL}/alerts/${id}/resolve`, { method: 'POST' });
      fetchAlerts();
    } catch (e) {
      console.error('Failed to resolve alert:', e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  return { alerts, loading, error, resolveAlert, refetch: fetchAlerts };
}
