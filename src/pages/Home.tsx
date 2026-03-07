import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Sparkles, TrendingUp, Shield, Upload, BarChart3, Flame, Package, Newspaper, ChevronDown, CloudRain, Gift, MessageCircle } from "lucide-react";

/** WhatsApp Support hotline — same as whatsapp sandbox: opens customer care chat with pre-filled message. */
const SUPPORT_WHATSAPP_URL = "https://wa.me/918617888597?text=" + encodeURIComponent("Hi, I need support from customer care.");
import { AuthModal } from "@/components/AuthModal";
import OpeningAnimation from "@/components/OpeningAnimation";
import GlobalLanguageSelector from "@/components/GlobalLanguageSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useWalletOptional } from "@/context/WalletContext";
import { useTranslation } from "@/context/TranslationContext";
import { motion } from "framer-motion";

/** Catches errors from OpeningAnimation (e.g. R3F/drei) and skips intro so app never fails to load */
class IntroErrorBoundary extends React.Component<
  { onError: () => void; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: true } {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render(): React.ReactNode {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showAnimation, setShowAnimation] = useState(() => {
    const seen = sessionStorage.getItem("agroScope_intro_seen");
    return !seen;
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleAnimationComplete = () => {
    sessionStorage.setItem("agroScope_intro_seen", "true");
    setShowAnimation(false);
  };
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userFirstName, setUserFirstName] = useState("");
  const [userRole, setUserRole] = useState<"farmer" | "startup" | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const heroBgRef = useRef<HTMLDivElement | null>(null);
  const wallet = useWalletOptional();
  const walletRef = useRef(wallet);
  walletRef.current = wallet;

  useEffect(() => {
    if (!isLoggedIn) return;
    const today = new Date().toDateString();
    if (sessionStorage.getItem("agro_last_login_bonus") === today) return;
    const w = walletRef.current;
    if (!w) return;
    w.earn("DAILY_LOGIN").then(() => sessionStorage.setItem("agro_last_login_bonus", today)).catch(() => {});
  }, [isLoggedIn]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userRaw = localStorage.getItem("user");
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw);
          setIsLoggedIn(true);
        const nameSource = user.name || user.company_name || user.email || "User";
        const firstName = String(nameSource).split(" ")[0];
        setUserFirstName(firstName);
        setUserRole(user.role === "startup" ? "startup" : user.role === "farmer" ? "farmer" : null);
      } catch {
        setIsLoggedIn(false);
        setUserFirstName("");
        setUserRole(null);
      }
        } else {
          setIsLoggedIn(false);
          setUserFirstName("");
          setUserRole(null);
        }
  }, [authModalOpen]);

  const handleAuthSuccess = () => {
    const token = localStorage.getItem("authToken");
    const userRaw = localStorage.getItem("user");
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw);
        setIsLoggedIn(true);
        const nameSource = user.name || user.company_name || user.email || "User";
        const firstName = String(nameSource).split(" ")[0];
        setUserFirstName(firstName);
        setUserRole(user.role === "startup" ? "startup" : user.role === "farmer" ? "farmer" : null);
      } catch {}
    }
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUserFirstName("");
    setUserRole(null);
    toast({ title: t("home_logged_out"), description: t("home_logged_out_desc") });
    navigate("/home");
  };

  const handleCTAClick = () => {
    if (userRole === "farmer") navigate("/input");
    else if (userRole === "startup") navigate("/startup-input");
    else setAuthModalOpen(true);
  };

  useEffect(() => {
    const hero = heroRef.current;
    const bg = heroBgRef.current;
    if (!hero || !bg) return;

    const onMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      bg.style.transform =
        `perspective(1400px) rotateX(${y * -8}deg) rotateY(${x * 10}deg)`;
    };

    const onLeave = () => {
      bg.style.transform =
        "perspective(1400px) rotateX(0deg) rotateY(0deg)";
    };

    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    return () => {
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <>
      {showAnimation && (
        <IntroErrorBoundary onError={handleAnimationComplete}>
          <OpeningAnimation onComplete={handleAnimationComplete} />
        </IntroErrorBoundary>
      )}
      <div
        style={{
          opacity: showAnimation ? 0 : 1,
          transition: "opacity 0.6s ease-in-out",
          transitionDelay: showAnimation ? "0s" : "0.1s",
          minHeight: "100vh",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            minHeight: "100vh",
            width: "100%",
            overflowX: "hidden",
          }}
        >
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="bg-primary rounded-full p-2">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">AgroScope</span>
          </button>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-2 gap-2"
              onClick={() => window.open(SUPPORT_WHATSAPP_URL, "_blank", "noopener,noreferrer")}
              type="button"
            >
              <MessageCircle className="h-4 w-4" />
              Support
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-2 gap-2"
                >
                  <Newspaper className="h-4 w-4" />
                  Agro News Live
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[200px]">
                <DropdownMenuItem onClick={() => navigate("/agro-news-live")} className="gap-2 cursor-pointer">
                  <Newspaper className="h-4 w-4" />
                  Agro News Live
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/weather-forecast")} className="gap-2 cursor-pointer">
                  <CloudRain className="h-4 w-4" />
                  Weather Forecast
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/loyalty")} className="gap-2 cursor-pointer">
                  <Gift className="h-4 w-4" />
                  Loyalty Program
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <GlobalLanguageSelector />
            {isLoggedIn && wallet && (
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 rounded-full border border-[rgba(0,200,83,0.2)] bg-[rgba(0,200,83,0.1)] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-[rgba(0,200,83,0.2)]"
              >
                <span>🪙 {wallet.agroCoins % 1 === 0 ? wallet.agroCoins : Number(wallet.agroCoins.toFixed(8))}</span>
                <span>·</span>
                <span>⚡ {wallet.agroCredits.toLocaleString("en-IN")}</span>
              </button>
            )}
            {!isLoggedIn ? (
              <Button 
                variant="outline" 
                onClick={() => setAuthModalOpen(true)}
                className="border-2"
              >
                {t("nav_login")} / Sign Up
              </Button>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/notifications')}
                >
                  {t("nav_notifications")}
                </Button>
              <Button 
                variant="outline" 
                onClick={handleProfileClick}
                className="border-2"
              >
                {t("nav_profile")} ({userFirstName})
              </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section — full viewport */}
      <section
        className="hero-immersive"
        ref={heroRef}
        style={{
          margin: 0,
          width: "100%",
          minHeight: "100vh",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* ── 3D BG LAYER — mouse parallax target ── */}
        <div className="hero-bg" ref={heroBgRef}>
          {/* Counter-rotating rings */}
          <div className="hero-ring hero-ring--front" />
          <div className="hero-ring hero-ring--back" />

          {/* Floating glass cards */}
          <div className="hero-cards-wrapper">
            <div className="hero-card hero-card--left" />
            <div className="hero-card hero-card--right" />
          </div>

          {/* Rising particles */}
          <div className="hero-particles-wrapper">
            <span
              className="hero-particle"
              style={{
                top: "15%",
                left: "8%",
                animationDuration: "18s",
                animationDelay: "0s",
              }}
            />
            <span
              className="hero-particle"
              style={{
                top: "65%",
                left: "22%",
                animationDuration: "22s",
                animationDelay: "3s",
              }}
            />
            <span
              className="hero-particle"
              style={{
                top: "25%",
                left: "78%",
                animationDuration: "16s",
                animationDelay: "6s",
              }}
            />
            <span
              className="hero-particle"
              style={{
                top: "75%",
                left: "88%",
                animationDuration: "20s",
                animationDelay: "1.5s",
              }}
            />
            <span
              className="hero-particle"
              style={{
                top: "10%",
                left: "92%",
                animationDuration: "26s",
                animationDelay: "4.5s",
              }}
            />
            <span
              className="hero-particle"
              style={{
                top: "50%",
                left: "5%",
                animationDuration: "19s",
                animationDelay: "8s",
              }}
            />
            <span
              className="hero-particle"
              style={{
                top: "85%",
                left: "45%",
                animationDuration: "24s",
                animationDelay: "2s",
              }}
            />
          </div>
        </div>

        {/* ── CONTENT (z-index: 5) ── */}
        <div
          className="hero-content"
          style={{
            position: "relative",
            zIndex: 5,
            width: "100%",
            maxWidth: "860px",
            margin: "0 auto",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Kicker */}
          <div className="hero-kicker">
            AI-POWERED MARKETPLACE FOR FARMERS
          </div>

          {/* Title */}
          <h1 className="hero-title">
            <span>{t("home_hero_title")}</span>
            <br />
            <span>
              <span className="highlight">
                {t("home_hero_highlight")}
              </span>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle">
            {t("home_hero_subtitle")}
          </p>

          {/* CTA row */}
          <div className="hero-cta-row">
            <button
              className="hero-cta-main"
              onClick={handleCTAClick}
            >
              <span className="hero-cta-icon">📍</span>
              <span>{userRole === "startup" ? t("home_cta_startup") : t("home_cta_farmer")}</span>
            </button>
            <span className="hero-pill">
              Instant, transparent pricing • No middlemen
            </span>
          </div>

          {/* Trust badges */}
          <div className="hero-badges">
            <span>AI-Powered Matching</span>
            <span>Instant Valuations</span>
            <span>100% free for farmers</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        className="py-20"
        style={{ background: "#ffffff", marginTop: 40 }}
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Why Choose AgroScope?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform agricultural waste into valuable resources with our cutting-edge technology
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Sparkles className="w-7 h-7 text-primary" />, titleKey: "home_feature1_title" as const, descKey: "home_feature1_desc" as const },
              { icon: <TrendingUp className="w-7 h-7 text-secondary" />, titleKey: "home_feature2_title" as const, descKey: "home_feature2_desc" as const },
              { icon: <Shield className="w-7 h-7 text-accent" />, titleKey: "home_feature3_title" as const, descKey: "home_feature3_desc" as const },
            ].map((feature, index) => (
              <motion.div
                key={feature.titleKey}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  delay: index * 0.12,
                  duration: 0.7,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Card className="border-2 hover:shadow-card transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader>
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-2xl">{t(feature.titleKey)}</CardTitle>
                    <CardDescription className="text-base">
                      {t(feature.descKey)}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Tools: Forecast, Carbon, Recommendations */}
          <div className="mt-12 pt-12 border-t">
            <h3 className="text-xl font-semibold mb-4 text-center">Tools & Insights</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate("/forecast")}
              >
                <BarChart3 className="w-6 h-6" />
                <span>{t("nav_forecast")}</span>
                <span className="text-xs font-normal text-muted-foreground">Supply prediction</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate("/carbon")}
              >
                <Flame className="w-6 h-6" />
                <span>{t("nav_carbon")}</span>
                <span className="text-xs font-normal text-muted-foreground">CO₂ impact</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate("/recommendations")}
              >
                <Package className="w-6 h-6" />
                <span>Recommendations</span>
                <span className="text-xs font-normal text-muted-foreground">Waste to products</span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-secondary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Maximize Your Waste Value?
          </h2>
          <p className="text-xl mb-8 opacity-95 max-w-2xl mx-auto">
            Join thousands of farmers already transforming their agricultural waste into profit
          </p>
          <Button 
            variant="cta"
            size="lg"
            className="text-lg px-8 py-6 h-auto bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => {
              if (userRole === "farmer") navigate('/input');
              else if (userRole === "startup") navigate('/startup-input');
              else setAuthModalOpen(true);
            }}
          >
            <Upload className="w-5 h-5 mr-2" />
            {userRole === "startup" ? t("home_cta_startup") : userRole === "farmer" ? t("home_cta_farmer") : t("common_get_started")}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-card">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 AgroScope. Transforming Waste into Value.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        onAuthSuccess={handleAuthSuccess}
      />
        </div>
      </div>
    </>
  );
};

export default Home;
