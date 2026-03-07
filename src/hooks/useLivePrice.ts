import { useState, useCallback, useEffect } from 'react';

export interface LivePriceResult {
  pricePerKg: number;
  priceRange: { min: number; max: number };
  trend: 'rising' | 'falling' | 'stable';
  confidence: 'high' | 'medium' | 'low';
  source: string;
  lastUpdated: string;
  carbonValuePerTon: number;
  totalLotValue: number;
}

export function useLivePrice(wasteType: string, city: string, quantityTons: number = 1) {
  const [data, setData] = useState<LivePriceResult | null>(null);
  const [loading, setLoading] = useState(!!wasteType?.trim());
  const [error, setError] = useState<string | null>(null);

  const fetchLive = useCallback(async () => {
    if (!wasteType?.trim()) return;
    setLoading(true);
    setData(null);
    setError(null);
    try {
      const params = new URLSearchParams({
        wasteType: wasteType.trim(),
        city: (city || 'Chennai').trim(),
        quantityTons: String(quantityTons),
      });
      const res = await fetch(`/api/market-price/live?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json as LivePriceResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load live price');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [wasteType, city, quantityTons]);

  useEffect(() => {
    fetchLive();
  }, [fetchLive]);

  return { data, loading, error, refetch: fetchLive };
}
