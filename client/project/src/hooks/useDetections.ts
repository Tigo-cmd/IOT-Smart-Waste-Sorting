import { useState, useEffect, useCallback } from 'react';
import { Detection, FilterState } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export function useDetections(filters: FilterState) {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.device && filters.device !== 'all') params.append('device', filters.device);
      if (filters.category && filters.category !== 'all') params.append('category', filters.category);
      if (filters.dateFrom) params.append('from', filters.dateFrom);
      if (filters.dateTo) params.append('to', filters.dateTo);

      const response = await fetch(`${API_URL}/detections?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch detections');

      const data = await response.json();
      setDetections(data as Detection[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch detections');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDetections();

    // Poll for updates every 5 seconds since we don't have Supabase Realtime anymore
    const interval = setInterval(fetchDetections, 5000);
    return () => clearInterval(interval);
  }, [fetchDetections]);

  return { detections, loading, error, refetch: fetchDetections };
}
