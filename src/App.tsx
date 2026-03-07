import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TranslationProvider } from "@/context/TranslationContext";
import { WalletProvider } from "@/context/WalletContext";
import TranslateOnNavigate from "@/components/TranslateOnNavigate";
import CoinCelebration from "@/components/CoinCelebration";
import AgroGuideButton from "@/components/AgroGuideButton";
import Home from "./pages/Home";
import Input from "./pages/Input";
import Results from "./pages/Results";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import StartupInput from "./pages/StartupInput";
import Profile from "./pages/Profile";
import FarmerInventory from "./pages/FarmerInventory";
import StartupMatches from "./pages/StartupMatches";
import Notifications from "./pages/Notifications";
const Forecast = lazy(() => import("./pages/Forecast"));
const CarbonSimulator = lazy(() => import("./pages/CarbonSimulator"));
const Recommendations = lazy(() => import("./pages/Recommendations"));
const AgroNewsLive = lazy(() => import("./pages/AgroNewsLive"));
const WeatherForecast = lazy(() => import("./pages/WeatherForecast"));
const LoyaltyProgram = lazy(() => import("./pages/LoyaltyProgram"));
const LoyaltyTierPage = lazy(() => import("./pages/LoyaltyTierPage"));

const queryClient = new QueryClient();

const App = () => (
  <TranslationProvider>
    <WalletProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/input" element={<Input />} />
          <Route path="/startup-input" element={<StartupInput />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/farmer-inventory" element={<FarmerInventory />} />
          <Route path="/startup-matches" element={<StartupMatches />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/forecast" element={<Suspense fallback={<div className="p-8 text-center">Loading...</div>}><Forecast /></Suspense>} />
          <Route path="/carbon" element={<Suspense fallback={<div className="p-8 text-center">Loading...</div>}><CarbonSimulator /></Suspense>} />
          <Route path="/recommendations" element={<Suspense fallback={<div className="p-8 text-center">Loading...</div>}><Recommendations /></Suspense>} />
          <Route path="/agro-news-live" element={<Suspense fallback={<div className="p-8 text-center">Loading...</div>}><AgroNewsLive /></Suspense>} />
          <Route path="/weather-forecast" element={<Suspense fallback={<div className="p-8 text-center">Loading...</div>}><WeatherForecast /></Suspense>} />
          <Route path="/loyalty" element={<Suspense fallback={<div className="p-8 text-center">Loading...</div>}><LoyaltyProgram /></Suspense>} />
          <Route path="/loyalty/tier/:tier" element={<Suspense fallback={<div className="p-8 text-center">Loading...</div>}><LoyaltyTierPage /></Suspense>} />
          <Route path="/results" element={<Results />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
          <AgroGuideButton />
          <CoinCelebration />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </WalletProvider>
  </TranslationProvider>
);

export default App;
