import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, Home, MapPin, Package, TrendingDown, Clock } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/home");
  };

  // Mock data for available leads
  const leads = [
    {
      id: 1,
      material: "Paddy Husk",
      quantity: "5 Tons",
      proximity: "5 km away",
      postedTime: "2 hours ago",
      estimatedValue: "$350-$500",
      quality: "Premium Grade",
    },
    {
      id: 2,
      material: "Paddy Husk",
      quantity: "8 Tons",
      proximity: "12 km away",
      postedTime: "5 hours ago",
      estimatedValue: "$560-$800",
      quality: "Standard Grade",
    },
    {
      id: 3,
      material: "Paddy Husk",
      quantity: "3 Tons",
      proximity: "8 km away",
      postedTime: "1 day ago",
      estimatedValue: "$210-$300",
      quality: "Premium Grade",
    },
    {
      id: 4,
      material: "Paddy Husk",
      quantity: "10 Tons",
      proximity: "15 km away",
      postedTime: "2 days ago",
      estimatedValue: "$700-$1000",
      quality: "Standard Grade",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
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
            <Button variant="outline" size="sm" onClick={() => navigate('/home')}>
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/notifications')}>Notifications</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>Profile</Button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            The Repurposer's Hub
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Access verified, localized agricultural feedstock from farmers in your area
          </p>

          {/* Value Proposition Banner */}
          <Card className="border-2 border-secondary bg-gradient-to-r from-secondary/10 to-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Why Choose AgroScope for Sourcing?
                  </h3>
                  <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-secondary" />
                      <span>Reduce logistics costs by 40%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-secondary" />
                      <span>Verified quality & quantity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-secondary" />
                      <span>Direct from source pricing</span>
                    </div>
                  </div>
                </div>
                <Badge className="bg-secondary text-secondary-foreground text-sm px-4 py-2 whitespace-nowrap">
                  {leads.length} New Leads Available
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leads Grid */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Available Supplies Near You
          </h2>
          
          <div className="grid gap-6">
            {leads.map((lead) => (
              <Card 
                key={lead.id} 
                className="border-2 hover:shadow-card transition-all duration-300 hover:border-primary"
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Package className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl mb-1">{lead.material}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{lead.postedTime}</span>
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant="outline"
                      className={lead.quality === "Premium Grade" ? "border-primary text-primary" : ""}
                    >
                      {lead.quality}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid md:grid-cols-4 gap-6 mb-6">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Quantity</div>
                      <div className="text-xl font-bold text-foreground">{lead.quantity}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Distance</div>
                      <div className="text-xl font-bold text-foreground flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-secondary" />
                        {lead.proximity}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Market Value</div>
                      <div className="text-xl font-bold text-secondary">{lead.estimatedValue}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Best Use</div>
                      <div className="text-sm font-semibold text-foreground">Insulation Boards</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      variant="cta" 
                      size="lg" 
                      className="flex-1"
                      onClick={() => {
                        alert("Payment gateway would process your interest and connect you with the farmer. Commission: 10% of transaction value.");
                      }}
                    >
                      Express Interest & Secure Supply
                    </Button>
                    <Button variant="outline" size="lg">
                      View Details
                    </Button>
                  </div>

                  <p className="text-xs text-center text-muted-foreground mt-3">
                    Pay only when you connect • Transparent commission structure • Direct farmer contact
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Empty State Message */}
        <div className="mt-12 text-center">
          <Card className="border-2 border-dashed bg-muted/30">
            <CardContent className="p-12">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Looking for something specific?
              </h3>
              <p className="text-muted-foreground mb-6">
                Set up custom alerts for specific materials, quantities, or locations
              </p>
              <Button variant="outline" size="lg">
                Create Custom Alert
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
