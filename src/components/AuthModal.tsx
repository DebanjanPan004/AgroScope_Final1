import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sprout, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess: () => void;
}

export const AuthModal = ({ open, onOpenChange, onAuthSuccess }: AuthModalProps) => {
  const [authMode, setAuthMode] = useState<"login" | "farmer-signup" | "startup-signup">("login");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Farmer signup state
  const [farmerName, setFarmerName] = useState("");
  const [farmerEmail, setFarmerEmail] = useState("");
  const [farmerPassword, setFarmerPassword] = useState("");
  const [farmerConfirmPassword, setFarmerConfirmPassword] = useState("");

  // Startup signup state
  const [companyName, setCompanyName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [startupPassword, setStartupPassword] = useState("");
  const [startupConfirmPassword, setStartupConfirmPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Login failed" }));
        throw new Error(err.message || "Login failed");
      }
      const result = await response.json();
      // Expecting { token, user: { name|company_name, role, email } }
      localStorage.setItem("authToken", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      toast({ title: "Welcome back!", description: "You have successfully logged in." });

      onAuthSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFarmerSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (farmerPassword !== farmerConfirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: farmerName,
          email: farmerEmail,
          password: farmerPassword,
          role: "farmer",
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Signup failed" }));
        throw new Error(err.message || "Signup failed");
      }
      const result = await response.json();
      localStorage.setItem("authToken", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      toast({ title: "Account created!", description: "Welcome to AgroScope. Your farmer account is ready." });

      onAuthSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStartupSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (startupPassword !== startupConfirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          email: businessEmail,
          password: startupPassword,
          role: "startup",
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Registration failed" }));
        throw new Error(err.message || "Registration failed");
      }
      const result = await response.json();
      localStorage.setItem("authToken", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      toast({ title: "Business registered!", description: "Welcome to AgroScope. Your startup account is ready." });

      onAuthSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Join AgroScope</DialogTitle>
          <DialogDescription>
            The Circular Economy Platform
          </DialogDescription>
        </DialogHeader>

        <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="farmer-signup">Farmer</TabsTrigger>
            <TabsTrigger value="startup-signup">Startup</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 py-4">
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail("f1@gmail.com");
                    setLoginPassword("farmer");
                  }}
                  className="flex-1 py-2 px-3 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-primary/20 transition-colors"
                >
                  🌾 Demo Farmer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail("east@argo");
                    setLoginPassword("east@argo");
                  }}
                  className="flex-1 py-2 px-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-amber-500/20 transition-colors"
                >
                  🚀 Demo Startup
                </button>
              </div>
              <p className="text-center text-xs text-muted-foreground mb-4">
                Click to auto-fill demo credentials
              </p>
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthMode("farmer-signup")}
                  className="text-primary font-semibold hover:underline"
                >
                  Register Here
                </button>
              </p>
            </form>
          </TabsContent>

          {/* Farmer Signup Tab */}
          <TabsContent value="farmer-signup">
            <form onSubmit={handleFarmerSignup} className="space-y-4 py-4">
              <div className="flex items-center gap-2 mb-4 p-3 bg-primary/10 rounded-lg">
                <Sprout className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm">Farmer Sign Up</p>
                  <p className="text-xs text-muted-foreground">100% Free Service</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="farmer-name">Full Name</Label>
                <Input
                  id="farmer-name"
                  placeholder="Jane Doe"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmer-email">Email</Label>
                <Input
                  id="farmer-email"
                  type="email"
                  placeholder="jane.doe@farm.com"
                  value={farmerEmail}
                  onChange={(e) => setFarmerEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmer-password">Set Password</Label>
                <Input
                  id="farmer-password"
                  type="password"
                  placeholder="Create a password"
                  value={farmerPassword}
                  onChange={(e) => setFarmerPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmer-confirm">Confirm Password</Label>
                <Input
                  id="farmer-confirm"
                  type="password"
                  placeholder="Confirm your password"
                  value={farmerConfirmPassword}
                  onChange={(e) => setFarmerConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="cta" className="w-full" disabled={loading}>
                {loading ? "Creating Account..." : "Create Farmer Account"}
              </Button>
            </form>
          </TabsContent>

          {/* Startup Signup Tab */}
          <TabsContent value="startup-signup">
            <form onSubmit={handleStartupSignup} className="space-y-4 py-4">
              <div className="flex items-center gap-2 mb-4 p-3 bg-secondary/10 rounded-lg">
                <Building2 className="w-5 h-5 text-secondary" />
                <div>
                  <p className="font-semibold text-sm">Startup Sign Up</p>
                  <p className="text-xs text-muted-foreground">Access Verified Leads</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  placeholder="Agri-Board Solutions"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-email">Business Email</Label>
                <Input
                  id="business-email"
                  type="email"
                  placeholder="procurement@agriboard.com"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startup-password">Set Password</Label>
                <Input
                  id="startup-password"
                  type="password"
                  placeholder="Create a password"
                  value={startupPassword}
                  onChange={(e) => setStartupPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startup-confirm">Confirm Password</Label>
                <Input
                  id="startup-confirm"
                  type="password"
                  placeholder="Confirm your password"
                  value={startupConfirmPassword}
                  onChange={(e) => setStartupConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
                {loading ? "Registering Business..." : "Register Your Business"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
