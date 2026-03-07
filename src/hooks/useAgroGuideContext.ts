import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { PAGE_QUICK_CHIPS } from "@/lib/agroGuideKnowledge";

const PAGE_DESCRIPTIONS: Record<string, string> = {
  "/home": "User is on the Home landing page. Help them understand AgroScope, choose between Farmer and Startup role, find Tools and Insights, or navigate to login.",
  "/input": "User is on the Farmer Input page — where farmers log crop waste. Help with form filling, price negotiation, satellite detection, weight estimator, AgroCredits, and saving to inventory.",
  "/startup-input": "User is on the Startup Input page. They want to post demand for crop waste. Help them fill in their requirements and find farmer supply.",
  "/profile": "User is on their Profile page. Help with wallet tabs (Farmer Wallet vs Startup Wallet), AgroCredits to AgroCoins conversion (1000:1), transfers, and transaction history.",
  "/farmer-inventory": "User is on the Farmer Inventory page. Farmers manage their listed supply. Startups browse and request provisions. Help with filters, statuses, and requesting provisions.",
  "/startup-matches": "User is on Startup Matches. AI-matched farmers for their demand. Help with compatibility scores, requesting provisions, and filters.",
  "/notifications": "User is checking Notifications. Explain notification types and how to act on order requests or price alerts.",
  "/forecast": "User is on the 30-Day Supply Forecast page. Help them read the chart, understand confidence bands, use the AI forecast option, and find the best sell window.",
  "/carbon": "User is on the Carbon Simulator. Help them understand the CO₂ formulas, tree equivalents, carbon credits, and rupee value.",
  "/recommendations": "User is on Recommendations. They want to know what products they can make from their specific waste type.",
  "/agro-news-live": "User is on Agro News Live. Help with categories, search, bookmarks, and understanding how Tavily powers the news feed.",
  "/weather-forecast": "User is on Weather Forecast. Help them understand Open-Meteo data, how it differs from supply forecast, and how to use advisories.",
  "/loyalty": "User is on the Loyalty Program page. Explain the static company trust tiers (A Elite, B Established, C Emerging), the 10 bioenergy companies, and that no login is needed.",
  "/dashboard": "User is on the Dashboard hub. Help them navigate to the right section.",
};

const PAGE_LABELS: Record<string, string> = {
  "/home": "Home Page",
  "/input": "Farmer Input",
  "/startup-input": "Startup Input",
  "/profile": "Profile & Wallet",
  "/farmer-inventory": "Farmer Inventory",
  "/startup-matches": "Startup Matches",
  "/notifications": "Notifications",
  "/forecast": "30-Day Supply Forecast",
  "/carbon": "Carbon Simulator",
  "/recommendations": "Recommendations",
  "/agro-news-live": "Agro News Live",
  "/weather-forecast": "Weather Forecast",
  "/loyalty": "Loyalty Program",
  "/dashboard": "Dashboard",
};

export function useAgroGuideContext() {
  const { pathname } = useLocation();
  return useMemo(
    () => ({
      context: PAGE_DESCRIPTIONS[pathname] ?? "User is somewhere on AgroScope. Help them find the right feature.",
      label: PAGE_LABELS[pathname] ?? "AgroScope",
      chips: PAGE_QUICK_CHIPS[pathname] ?? PAGE_QUICK_CHIPS["/home"],
    }),
    [pathname]
  );
}
