import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Globe, Users, Package, Database } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import { useToast } from "@/hooks/use-toast";

const ALL_SOURCES = [
  { id: "hackernews", label: "Hacker News", icon: "🟠" },
  { id: "github", label: "GitHub Issues", icon: "🐙" },
  { id: "stackoverflow", label: "Stack Overflow", icon: "📚" },
  { id: "appstore", label: "App Store", icon: "🍎" },
  { id: "reddit", label: "Reddit", icon: "🔴" },
  { id: "trustpilot", label: "Trustpilot", icon: "⭐" },
  { id: "web", label: "General Web", icon: "🌐" },
  { id: "youtube", label: "YouTube", icon: "▶️" },
  { id: "googleplay", label: "Google Play", icon: "🤖" },
];

const Analyze = () => {
  const [productName, setProductName] = useState("");
  const [website, setWebsite] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>(ALL_SOURCES.map((s) => s.id));
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const toggleSource = (sourceId: string) => {
    setSelectedSources((prev) =>
      prev.includes(sourceId) ? prev.filter((s) => s !== sourceId) : [...prev, sourceId]
    );
  };

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

    if (selectedSources.length === 0) {
      toast({
        title: "Select at least one source",
        description: "Choose at least one data source for the analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const params = new URLSearchParams({ product: productName.trim() });
    if (website.trim()) params.set("website", website.trim());
    if (competitors.trim()) params.set("competitors", competitors.trim());
    if (selectedSources.length < ALL_SOURCES.length) {
      params.set("sources", selectedSources.join(","));
    }

    navigate(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

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

            {/* Data Sources */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-foreground">
                <Database className="w-4 h-4 text-muted-foreground" />
                Data Sources
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SOURCES.map((source) => (
                  <label
                    key={source.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
                  >
                    <Checkbox
                      checked={selectedSources.includes(source.id)}
                      onCheckedChange={() => toggleSource(source.id)}
                    />
                    <span className="text-sm">{source.icon}</span>
                    <span className="text-sm text-foreground">{source.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSources(ALL_SOURCES.map((s) => s.id))}
                  className="text-xs text-primary hover:underline"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSources([])}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Clear all
                </button>
              </div>
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
            Analysis typically takes 15–30 seconds. We scan {selectedSources.length} source{selectedSources.length !== 1 ? "s" : ""} across the internet.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Analyze;
