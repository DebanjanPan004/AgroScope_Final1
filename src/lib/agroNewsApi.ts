// API client for Agro News Live - uses same-origin (Vite proxy) or VITE_API_BASE for direct backend URL

const base = (import.meta.env.VITE_API_BASE as string) ?? "";

export interface AgriNewsItem {
  id: string;
  headline: string;
  summary: string;
  location: string;
  category: "Policy" | "Market" | "Environment" | "Technology";
  impactScore: number;
  opportunityAlert: string | null;
  timestamp: number;
  tags: string[];
  region: string;
  farmerInsight?: string;
  isLive?: boolean;
  imageUrl?: string;
  url?: string;
  actionableSteps?: string[];
}

export interface LocationInfo {
  city: string;
  state: string;
  country: string;
  region: string;
  coordinates: { lat: number; lng: number };
  agricultureRegion?: string;
  insight?: string;
}

export interface GlobalNewsResponse {
  success: boolean;
  count: number;
  news: AgriNewsItem[];
  timestamp: number;
}

export interface LocationNewsResponse {
  success: boolean;
  location: LocationInfo;
  stats: { totalNews: number; alerts: number; opportunities: number };
  news: AgriNewsItem[];
  alerts: AgriNewsItem[];
  opportunities: AgriNewsItem[];
  timestamp: number;
}

export interface CategoryOption {
  value: string;
  label: string;
}

export interface RegionOption {
  value: string;
  label: string;
}

export async function getGlobalAgriNews(params?: {
  category?: string;
  region?: string;
  limit?: number;
}): Promise<GlobalNewsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.set("category", params.category);
  if (params?.region) queryParams.set("region", params.region);
  if (params?.limit) queryParams.set("limit", String(params.limit ?? 15));
  const path = `/api/agri-news/global${queryParams.toString() ? "?" + queryParams.toString() : ""}`;
  const url = base ? `${base.replace(/\/$/, "")}${path}` : path;
  const response = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
  if (!response.ok) throw new Error(`Failed to fetch global news: ${response.statusText}`);
  const data = (await response.json()) as GlobalNewsResponse;
  if (!Array.isArray(data.news)) data.news = [];
  return data;
}

export async function getLocationAgriNews(params: {
  latitude: number;
  longitude: number;
  radius?: number;
}): Promise<LocationNewsResponse> {
  const response = await fetch(`${base}/api/agri-news/location`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error(`Failed to fetch location news: ${response.statusText}`);
  return response.json();
}

export async function getAgriNewsCategories(): Promise<{ success: boolean; categories: CategoryOption[] }> {
  const response = await fetch(`${base}/api/agri-news/categories`, { method: "GET", headers: { "Content-Type": "application/json" } });
  if (!response.ok) throw new Error("Failed to fetch categories");
  return response.json();
}

export async function getAgriNewsRegions(): Promise<{ success: boolean; regions: RegionOption[] }> {
  const response = await fetch(`${base}/api/agri-news/regions`, { method: "GET", headers: { "Content-Type": "application/json" } });
  if (!response.ok) throw new Error("Failed to fetch regions");
  return response.json();
}

export async function getLiveAgriNewsUpdate(): Promise<{ success: boolean; news: AgriNewsItem }> {
  const response = await fetch(`${base}/api/agri-news/live`, { method: "GET", headers: { "Content-Type": "application/json" } });
  if (!response.ok) throw new Error("Failed to fetch live update");
  return response.json();
}
