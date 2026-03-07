import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Home, Package, Clock, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/context/TranslationContext";
import GlobalLanguageSelector from "@/components/GlobalLanguageSelector";

interface Provision {
  _id: string;
  wasteType: string;
  quantityTons: number;
  location: string;
  status: string;
  createdAt: string;
}

const FarmerInventory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [items, setItems] = useState<Provision[]>([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isStartup = user?.role === 'startup';
  const pageTitle = t("inventory_title");
  const pageSubtitle = t("inventory_subtitle");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate('/home');
      return;
    }
    if (isStartup) {
      fetch("/api/provisions", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (r) => {
          if (!r.ok) {
            setItems([]);
            return;
          }
          const data = await r.json().catch(() => ({}));
          setItems(Array.isArray(data.provisions) ? data.provisions : []);
        })
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    } else {
      fetch("/api/provisions/my", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (r) => {
          if (!r.ok) {
            setItems([]);
            return;
          }
          const data = await r.json().catch(() => ({}));
          setItems(Array.isArray(data.provisions) ? data.provisions : []);
        })
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }
  }, [navigate, isStartup]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-primary rounded-full p-2">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">AgroScope</span>
          </button>
          <div className="flex items-center gap-3">
            <GlobalLanguageSelector />
            <Button variant="outline" size="sm" onClick={() => navigate('/home')}>
              <Home className="w-4 h-4 mr-2" />
              {t("nav_home")}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <h1 className="text-3xl font-bold mb-2">{pageTitle}</h1>
        <p className="text-muted-foreground mb-6">{pageSubtitle}</p>
        {loading ? (
          <p className="text-muted-foreground">{t("common_loading")}</p>
        ) : items.length === 0 ? (
          <Card className="border-2">
            <CardContent className="p-8">{t("inventory_empty")}</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {items.map((it) => (
              <Card key={it._id} className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" /> {it.wasteType}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {it.location}</div>
                  <div>Quantity: <span className="font-semibold">{it.quantityTons} tons</span></div>
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {new Date(it.createdAt).toLocaleString()}</div>
                  <div>Status: <span className="font-semibold">{it.status}</span></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmerInventory;


