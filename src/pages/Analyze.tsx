import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireSubscription } from "@/components/RequireSubscription";
import { useSubscription } from "@/hooks/useSubscription";
import { sourceAllowedForPlan } from "@/lib/plans";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Globe, Users, Package, Database, FileText, TrendingUp } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import { useToast } from "@/hooks/use-toast";
import { useCapabilities } from "@/hooks/useCapabilities";

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
  { id: "custom", label: "Custom / Paste", icon: "📋" },
];

const MARKET_SIGNAL_SOURCES = [
  { id: "polymarket", label: "Polymarket Odds", icon: "💰" },
  { id: "reddit_top", label: "Reddit (scored)", icon: "🔼" },
  { id: "hackernews", label: "HN (scored)", icon: "🟠" },
  { id: "github", label: "GitHub Velocity", icon: "🚀" },
  { id: "youtube", label: "YouTube (views)", icon: "📊" },
  { id: "tiktok", label: "TikTok", icon: "🎵" },
  { id: "x", label: "X / Twitter", icon: "𝕏" },
];

const AnalyzeForm = () => {
  const { capabilities, loading: capabilitiesLoading, error: capabilitiesError } = useCapabilities();
  const available = (id: string, market = false) => (market ? capabilities.marketSources : capabilities.feedbackSources).some(s => s.id === id && s.available);
  const { plan, refresh, limits } = useSubscription();
  const [searchParams] = useSearchParams();
  const [productName, setProductName] = useState("");
  const [website, setWebsite] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>(ALL_SOURCES.filter((s) => s.id !== "custom").map((s) => s.id));
  const [includeMarketSignals, setIncludeMarketSignals] = useState(true);
  const [selectedMarketSources, setSelectedMarketSources] = useState<string[]>(
    MARKET_SIGNAL_SOURCES.filter((s) => !["tiktok", "x"].includes(s.id)).map((s) => s.id)
  );
  const [customFeedback, setCustomFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (capabilitiesLoading) return;
    setSelectedSources(prev => prev.filter(id => capabilities.feedbackSources.some(s => s.id === id && s.available)));
    setSelectedMarketSources(prev => prev.filter(id => capabilities.marketSources.some(s => s.id === id && s.available)));
  }, [capabilities, capabilitiesLoading]);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      refresh();
      toast({ title: "Subscription active", description: "You can now run product analyses." });
    }
  }, [searchParams, refresh, toast]);

  useEffect(() => {
    if (!plan || !limits) return;
    setSelectedSources((prev) =>
      prev.filter((id) => sourceAllowedForPlan(plan, id))
    );
    if (!limits.allowMarketSignals) {
      setIncludeMarketSignals(false);
    }
  }, [plan, limits]);

  const toggleSource = (sourceId: string) => {
    if (!available(sourceId)) return;
    if (plan && !sourceAllowedForPlan(plan, sourceId)) {
      toast({
        title: "Source not on your plan",
        description: `Upgrade to access ${sourceId}.`,
        variant: "destructive",
      });
      return;
    }
    setSelectedSources((prev) =>
      prev.includes(sourceId) ? prev.filter((s) => s !== sourceId) : [...prev, sourceId]
    );
  };

  const toggleMarketSource = (sourceId: string) => {
    if (!available(sourceId, true)) return;
    setSelectedMarketSources((prev) =>
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

    navigate('/dashboard', { state: { analysisInput: {
      productName: productName.trim(), website: website.trim() || undefined,
      competitors: competitors.trim() || undefined, sources: selectedSources,
      customFeedback: selectedSources.includes('custom') ? customFeedback.trim() || undefined : undefined,
      includeMarketSignals, marketSignalSources: selectedMarketSources, days: 30,
    } } });
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
            {capabilitiesError && <p role="status" className="text-sm text-muted-foreground">{capabilitiesError}</p>}
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
                {ALL_SOURCES.map((source) => {
                  const disabled = !available(source.id) || (plan ? !sourceAllowedForPlan(plan, source.id) : false);
                  return (
                  <label
                    key={source.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border border-border bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors ${disabled ? "opacity-40 pointer-events-none" : ""}`}
                  >
                    <Checkbox
                      checked={selectedSources.includes(source.id)}
                      disabled={disabled}
                      onCheckedChange={() => toggleSource(source.id)}
                    />
                    <span className="text-sm">{source.icon}</span>
                    <span className="text-sm text-foreground">{source.label}</span>
                    {!available(source.id) && <span className="text-xs">Unavailable</span>}
                  </label>
                );})}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSources(ALL_SOURCES.filter(s => available(s.id) && (!plan || sourceAllowedForPlan(plan, s.id))).map((s) => s.id))}
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

              {/* Custom feedback textarea */}
              {selectedSources.includes("custom") && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="customFeedback" className="flex items-center gap-2 text-foreground">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Paste feedback <span className="text-muted-foreground text-xs">(one item per line)</span>
                  </Label>
                  <Textarea
                    id="customFeedback"
                    value={customFeedback}
                    onChange={(e) => setCustomFeedback(e.target.value)}
                    placeholder={"Support ticket: Login keeps failing after 2FA update\nUser complaint: Can't export data to PDF anymore\nFeature request: Add dark mode support"}
                    className="bg-secondary border-border min-h-[120px] text-sm"
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    {customFeedback.trim() ? `${customFeedback.trim().split("\n").filter(Boolean).length} items` : "Paste support tickets, survey responses, or any text feedback"}
                  </p>
                </div>
              )}
            </div>

            {/* Industry Signals */}
            <div className="space-y-3">
              <label className={`flex items-center gap-2 cursor-pointer ${limits && !limits.allowMarketSignals ? "opacity-40 pointer-events-none" : ""}`}>
                <Checkbox
                  checked={includeMarketSignals}
                  onCheckedChange={(checked) => setIncludeMarketSignals(!!checked)}
                  disabled={limits ? !limits.allowMarketSignals : false}
                />
                <Label className="flex items-center gap-2 text-foreground cursor-pointer">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Include Industry Signals
                  <span className="text-muted-foreground text-xs">(Polymarket, engagement scores, GitHub velocity)</span>
                </Label>
              </label>

              {includeMarketSignals && (
                <div className="ml-6 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {MARKET_SIGNAL_SOURCES.map((source) => (
                      <label
                        key={source.id}
                        className="flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors"
                      >
                        <Checkbox
                          checked={selectedMarketSources.includes(source.id)}
                          disabled={!available(source.id, true)}
                          onCheckedChange={() => toggleMarketSource(source.id)}
                        />
                        <span className="text-sm">{source.icon}</span>
                        <span className="text-xs text-foreground">{source.label}</span>
                        {!available(source.id, true) && <span className="text-xs">Unavailable</span>}
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Availability reflects configured providers. Collection can still be limited by provider quotas or missing relevant results.
                  </p>
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full h-12 text-base"
              disabled={isLoading || capabilitiesLoading}
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

const Analyze = () => (
  <RequireAuth>
    <RequireSubscription>
      <AnalyzeForm />
    </RequireSubscription>
  </RequireAuth>
);

export default Analyze;
