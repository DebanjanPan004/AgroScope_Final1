import { useState, useCallback, useEffect } from 'react';

export interface ForecastPeriod {
  period: string;
  minPrice: number;
  maxPrice: number;
  trend: 'rising' | 'falling' | 'stable';
}

export interface MarketForecastResult {
  periods: ForecastPeriod[];
}

export function useMarketForecast(wasteType: string, city: string) {
  const [data, setData] = useState<MarketForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = useCallback(async () => {
    if (!wasteType?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        wasteType: wasteType.trim(),
        city: (city || 'Chennai').trim(),
      });
      const res = await fetch(`/api/market-price/forecast?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json as MarketForecastResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load forecast');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [wasteType, city]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  return { data, loading, error, refetch: fetchForecast };
}
