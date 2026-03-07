import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input as InputField } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Leaf, MapPin, Search, Loader2, Flame, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { evaluatePrice, getRecommendations, simulateCarbon, getForecastByWasteType } from "@/lib/api";

const COLD_STORAGE_HUBS = ["Chennai", "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat"];

const FORECAST_BY_CROP: Record<string, { tons: number; confidence: number }> = {
  "Paddy Husk": { tons: 5.50, confidence: 85 },
  "Wheat Straw": { tons: 4.20, confidence: 80 },
  "Corn Stalks": { tons: 3.80, confidence: 78 },
  "Sugarcane Bagasse": { tons: 8.90, confidence: 88 },
  "Coconut Shells": { tons: 2.60, confidence: 75 },
};

function getForecastFallback(wasteType: string) {
  const key = Object.keys(FORECAST_BY_CROP).find((k) => k.toLowerCase() === wasteType.trim().toLowerCase());
  const entry = key ? FORECAST_BY_CROP[key] : { tons: 5.5, confidence: 85 };
  return { predictedNext30Days: entry.tons, confidenceLevel: "HIGH" as const, confidencePercent: entry.confidence, isDemo: true };
}

const StartupInput = () => {
  const navigate = useNavigate();
  const [needType, setNeedType] = useState("");
  const [quantity, setQuantity] = useState("5");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [pricePerKg, setPricePerKg] = useState("");
  const [priceResult, setPriceResult] = useState<{
    status: string;
    label: string;
    color: string;
    marketPrice: number | null;
    market_status?: string;
    source: string | null;
    lastUpdated: string | null;
    isDemoPrice?: boolean;
  } | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState(false);
  const [carbonResult, setCarbonResult] = useState<{ co2SavedTons: number; equivalentTrees: number; carbonCreditsEarned: number } | null>(null);
  const [carbonLoading, setCarbonLoading] = useState(false);
  const [forecast, setForecast] = useState<{ predictedNext30Days: number; confidenceLevel: string; confidencePercent?: number; isDemo?: boolean } | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [nearestHub, setNearestHub] = useState<string>("Chennai");
  const [wasteQualityGrade, setWasteQualityGrade] = useState<string>("B");
  const [moisturePercentage, setMoisturePercentage] = useState<string>("12");
  const needTypeRef = useRef(needType);
  needTypeRef.current = needType;

  const priceNum = Number(pricePerKg);
  const hasValidPrice = !Number.isNaN(priceNum) && priceNum >= 0;
  const marketStatusFromInput = hasValidPrice
    ? priceNum < 50
      ? "Below Market Price"
      : priceNum > 100
        ? "Above Market Price"
        : "Current Market Price"
    : null;
  const marketStatusColor = marketStatusFromInput
    ? marketStatusFromInput === "Below Market Price"
      ? "blue"
      : marketStatusFromInput === "Above Market Price"
        ? "red"
        : "green"
    : null;

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLatitude(String(pos.coords.latitude));
        setLongitude(String(pos.coords.longitude));
      });
    }
    fetch("/api/crops/types")
      .then(r => r.json())
      .then(d => {
        const cats = Array.isArray(d.categories) && d.categories.length ? d.categories : ["Paddy Husk","Wheat Straw","Corn Stalks","Sugarcane Bagasse","Coconut Shells"];
        setCategories(cats);
        setNeedType(cats[0] || "");
      })
      .catch(() => {
        const fallback = ["Paddy Husk","Wheat Straw","Corn Stalks","Sugarcane Bagasse","Coconut Shells"];
        setCategories(fallback);
        setNeedType(fallback[0]);
      });
  }, []);

  useEffect(() => {
    if (!needType.trim()) return;
    setRecsLoading(true);
    setRecsError(false);
    getRecommendations(needType)
      .then((r) => { setRecommendations(r.products || []); setRecsError(false); })
      .catch(() => { setRecommendations([]); setRecsError(true); })
      .finally(() => setRecsLoading(false));
  }, [needType]);

  useEffect(() => {
    if (!needType.trim()) return;
    const requested = needType;
    setForecastLoading(true);
    setForecast(null);
    getForecastByWasteType(requested)
      .then((r) => {
        if (needTypeRef.current !== requested) return;
        const tons = r.predictedTonsNext30Days ?? r.predictedNext30Days ?? 0;
        const confidencePercent = (r as { confidencePercent?: number }).confidencePercent;
        setForecast({
          predictedNext30Days: tons,
          confidenceLevel: r.confidenceLevel ?? "LOW",
          confidencePercent,
          isDemo: (r as { isDemo?: boolean }).isDemo,
        });
      })
      .catch(() => {
        if (needTypeRef.current !== requested) return;
        setForecast(getForecastFallback(requested));
      })
      .finally(() => setForecastLoading(false));
  }, [needType]);

  const handleCheckPrice = async () => {
    const p = Number(pricePerKg);
    if (!needType.trim() || Number.isNaN(p) || p < 0) {
      toast({ title: "Enter crop waste type and price (₹/kg)", variant: "destructive" });
      return;
    }
    setPriceLoading(true);
    setPriceResult(null);
    try {
      const res = await evaluatePrice(needType, p, location || undefined, wasteQualityGrade || undefined);
      setPriceResult({
        status: res.status,
        label: res.label,
        color: res.color,
        marketPrice: res.marketPrice ?? null,
        market_status: (res as { market_status?: string }).market_status,
        source: res.source ?? null,
        lastUpdated: res.lastUpdated ?? null,
        isDemoPrice: res.isDemoPrice,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Price check failed";
      toast({ title: "Price check failed", description: msg.includes("fetch") ? "Ensure the backend is running." : msg, variant: "destructive" });
      setPriceResult({
        status: "unknown",
        label: "Unable to check price.",
        color: "gray",
        marketPrice: null,
        source: null,
        lastUpdated: null,
      });
    } finally {
      setPriceLoading(false);
    }
  };

  const handleCarbonSimulate = async () => {
    const q = Number(quantity);
    if (!needType.trim() || Number.isNaN(q) || q <= 0) {
      toast({ title: "Enter crop waste type and quantity", variant: "destructive" });
      return;
    }
    setCarbonLoading(true);
    setCarbonResult(null);
    try {
      const res = await simulateCarbon(needType, q);
      setCarbonResult({ co2SavedTons: res.co2SavedTons, equivalentTrees: res.equivalentTrees, carbonCreditsEarned: res.carbonCreditsEarned });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Carbon simulation failed";
      toast({ title: "Carbon simulation failed", description: msg.includes("fetch") ? "Ensure the backend is running." : msg, variant: "destructive" });
    } finally {
      setCarbonLoading(false);
    }
  };

  const { toast } = useToast();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast({ title: "Login required", description: "Please log in as a startup to search.", variant: "destructive" });
      return;
    }
    try {
      const url = new URL("/api/waste/matches", window.location.origin);
      url.searchParams.set("needType", needType);
      url.searchParams.set("quantityTons", String(Number(quantity)));
      if (latitude) url.searchParams.set("latitude", latitude);
      if (longitude) url.searchParams.set("longitude", longitude);
      const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || "Search failed");
      }
      const data = await resp.json();
      navigate("/farmer-inventory");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Search failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <button onClick={() => navigate("/home")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-primary rounded-full p-2">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">AgroScope</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Find Nearby Suppliers</h1>
            <p className="text-muted-foreground">Tell us what crop waste you need</p>
          </div>

          <Card className="p-6 md:p-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Crop Waste Need */}
              <div className="space-y-2">
                <Label htmlFor="need-type" className="text-base font-semibold">Crop Waste Need</Label>
                <Select value={needType} onValueChange={setNeedType}>
                  <SelectTrigger id="need-type" className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">Paddy husk has high demand for industrial applications</p>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-base font-semibold">Quantity (Tons)</Label>
                <div className="relative">
                  <InputField
                    id="quantity"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-12 text-lg"
                    placeholder="Enter quantity"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">tons</span>
                </div>
                <p className="text-sm text-muted-foreground">Average farm produces 3-8 tons of waste per season</p>
                {needType.trim() && (
                  <div className="mt-2.5 rounded-md bg-muted/50 p-3 text-sm">
                    {forecastLoading ? (
                      <p className="text-muted-foreground">Loading forecast…</p>
                    ) : forecast ? (
                      <>
                        <p className="font-medium">
                          <strong>Predicted Next 30 Days Supply:</strong>{" "}
                          <span>{forecast.predictedNext30Days.toFixed(2)}</span> tons
                        </p>
                        <p className="text-muted-foreground mt-1">
                          <strong>Confidence:</strong>{" "}
                          {forecast.confidencePercent != null ? `${forecast.confidencePercent}%` : forecast.confidenceLevel}
                        </p>
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Price per kg (optional) */}
              <div className="space-y-2">
                <Label htmlFor="price" className="text-base font-semibold">Price per kg (optional)</Label>
                <div className="flex gap-2">
                  <InputField
                    id="price"
                    type="number"
                    min="0"
                    step="0.1"
                    value={pricePerKg}
                    onChange={(e) => { setPricePerKg(e.target.value); setPriceResult(null); }}
                    className="h-12 flex-1"
                    placeholder="e.g. 2.5"
                  />
                  <Button type="button" variant="secondary" onClick={handleCheckPrice} disabled={priceLoading}>
                    {priceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check price"}
                  </Button>
                </div>
                {hasValidPrice && marketStatusFromInput && (
                  <div className="space-y-1.5">
                    <p className="text-sm text-muted-foreground">Price per kg: ₹{priceNum.toFixed(2)}</p>
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                        marketStatusColor === "green" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                        marketStatusColor === "red" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {marketStatusFromInput}
                    </span>
                  </div>
                )}
                {priceResult?.marketPrice != null && (
                  <p className="text-sm text-muted-foreground">
                    Reference market price: ₹{priceResult.marketPrice.toFixed(2)} per kg
                    {priceResult.isDemoPrice && <span className="ml-1 text-xs">(estimate)</span>}
                  </p>
                )}
              </div>

              {/* Quality & Moisture */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quality-grade" className="text-base font-semibold">Waste quality grade</Label>
                  <Select value={wasteQualityGrade} onValueChange={setWasteQualityGrade}>
                    <SelectTrigger id="quality-grade" className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moisture" className="text-base font-semibold">Moisture %</Label>
                  <InputField
                    id="moisture"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={moisturePercentage}
                    onChange={(e) => setMoisturePercentage(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-base font-semibold">Location</Label>
                <div className="space-y-3">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <InputField
                      id="location"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="h-12 pl-11"
                      placeholder="Enter your location"
                    />
                  </div>
                  <div className="w-full h-32 bg-muted/50 rounded-lg border border-border flex items-center justify-center">
                    <div className="text-center space-y-1">
                      <MapPin className="w-10 h-10 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">We'll match you with nearby suppliers to reduce transportation costs</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mt-3">
                  <Label htmlFor="nearest-hub" className="text-base font-semibold">Nearest Cold Storage Hub</Label>
                  <Select value={nearestHub} onValueChange={setNearestHub}>
                    <SelectTrigger id="nearest-hub" className="h-12">
                      <SelectValue placeholder="Select hub" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLD_STORAGE_HUBS.map((hub) => (
                        <SelectItem key={hub} value={hub}>{hub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Carbon impact */}
              <Card className="p-4 bg-muted/30">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium flex items-center gap-2"><Flame className="h-4 w-4" /> Carbon impact</p>
                    <p className="text-sm text-muted-foreground">Estimate CO₂ saved for your quantity</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleCarbonSimulate} disabled={carbonLoading}>
                    {carbonLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calculate"}
                  </Button>
                </div>
                {carbonResult && (
                  <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center text-sm">
                    <div><span className="font-semibold">{carbonResult.co2SavedTons}</span> t CO₂ saved</div>
                    <div><span className="font-semibold">{carbonResult.equivalentTrees}</span> trees eq.</div>
                    <div><span className="font-semibold">{carbonResult.carbonCreditsEarned}</span> credits</div>
                  </div>
                )}
              </Card>

              {/* Suggested products */}
              <Card className="p-4 bg-muted/30">
                <p className="font-medium flex items-center gap-2"><Package className="h-4 w-4" /> Suggested products</p>
                <p className="text-sm text-muted-foreground mb-2">What this waste can be converted into</p>
                {recsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : recommendations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {recommendations.map((p, i) => (
                      <span key={i} className="rounded-full bg-primary/10 px-3 py-1 text-sm">{p}</span>
                    ))}
                  </div>
                ) : recsError ? (
                  <p className="text-sm text-destructive">Couldn&apos;t load suggestions.</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a crop waste type above</p>
                )}
              </Card>

              <div className="pt-4">
                <Button
                  type="button"
                  variant="cta"
                  size="lg"
                  className="w-full text-lg"
                  onClick={() => navigate("/farmer-inventory")}
                >
                  <Search className="mr-2 h-5 w-5" />
                  Find the Nearest Farmer
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StartupInput;
