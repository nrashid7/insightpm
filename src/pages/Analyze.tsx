import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, ArrowRight, Globe, Users, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Analyze = () => {
  const [productName, setProductName] = useState("");
  const [website, setWebsite] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productName.trim()) {
      toast({
        title: "Product name required",
        description: "Please enter the name of the product you want to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Navigate to dashboard with query params — dashboard will trigger the analysis
    const params = new URLSearchParams({ product: productName.trim() });
    if (website.trim()) params.set("website", website.trim());
    if (competitors.trim()) params.set("competitors", competitors.trim());

    navigate(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground">InsightPM</span>
          </Link>
        </div>
      </nav>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center pt-16 px-6">
        <motion.div
          className="w-full max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">
              Analyze a <span className="text-gradient-primary">Product</span>
            </h1>
            <p className="text-muted-foreground">
              Enter product details and our AI will gather feedback insights from across the internet.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="productName" className="flex items-center gap-2 text-foreground">
                <Package className="w-4 h-4 text-primary" />
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Notion, Figma, Slack"
                className="bg-secondary border-border h-11"
                required
              />
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2 text-foreground">
                <Globe className="w-4 h-4 text-muted-foreground" />
                Product Website <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://notion.so"
                className="bg-secondary border-border h-11"
                type="url"
              />
            </div>

            {/* Competitors */}
            <div className="space-y-2">
              <Label htmlFor="competitors" className="flex items-center gap-2 text-foreground">
                <Users className="w-4 h-4 text-muted-foreground" />
                Competitors <span className="text-muted-foreground text-xs">(optional, comma-separated)</span>
              </Label>
              <Input
                id="competitors"
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
                placeholder="e.g. Coda, Obsidian, Roam"
                className="bg-secondary border-border h-11"
              />
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full h-12 text-base"
              disabled={isLoading}
            >
              {isLoading ? "Starting Analysis..." : "Analyze Product"}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Analysis typically takes 15–30 seconds. We scan Reddit, App Store reviews, and more.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Analyze;
