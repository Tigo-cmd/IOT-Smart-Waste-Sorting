import { useMemo } from 'react';
import { Detection, CategoryStats, DailyCount, WasteClass } from '../types';

export function useStats(detections: Detection[]) {
  const categoryStats = useMemo<CategoryStats>(() => {
    const stats: CategoryStats = { plastic: 0, metal: 0, organic: 0, paper: 0, nylon: 0, unknown: 0 };
    detections.forEach((d) => {
      // Runtime check to strictly ignore any residual demo categories
      if (['plastic', 'metal', 'organic', 'paper', 'nylon', 'unknown'].includes(d.waste_class)) {
        stats[d.waste_class as WasteClass] = (stats[d.waste_class as WasteClass] ?? 0) + 1;
      }
    });
    return stats;
  }, [detections]);

  const totalDetections = useMemo(() => detections.length, [detections]);

  const avgConfidence = useMemo(() => {
    if (!detections.length) return 0;
    const sum = detections.reduce((acc, d) => acc + d.confidence, 0);
    return sum / detections.length;
  }, [detections]);

  const lowConfidenceCount = useMemo(
    () => detections.filter((d) => d.confidence < 0.7).length,
    [detections]
  );

  const dailyCounts = useMemo<DailyCount[]>(() => {
    const days: DailyCount[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = detections.filter((d) => {
        const ts = new Date(d.timestamp);
        return ts >= date && ts < nextDate;
      }).length;

      days.push({
        date: date.toISOString().split('T')[0],
        label: i === 0 ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' }),
        count,
      });
    }
    return days;
  }, [detections]);

  return { categoryStats, totalDetections, avgConfidence, lowConfidenceCount, dailyCounts };
}
