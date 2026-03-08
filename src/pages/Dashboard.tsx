import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Zap, Search, Save, Download, History, Share2, FileText, LogOut,
  AlertTriangle, RefreshCw, Bell,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { analyzeProduct } from "@/lib/api/analyze";
import type { AnalysisResult } from "@/lib/types/analysis";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import AnalysisProgress from "@/components/dashboard/AnalysisProgress";
import StatCards from "@/components/dashboard/StatCards";
import SourceChart from "@/components/dashboard/SourceChart";
import ChartsGrid from "@/components/dashboard/ChartsGrid";
import ClusterGrid from "@/components/dashboard/ClusterGrid";
import OpportunityScores from "@/components/dashboard/OpportunityScores";
import FeatureRequestsSection from "@/components/dashboard/FeatureRequests";
import FeedbackSamplesSection from "@/components/dashboard/FeedbackSamples";

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const initialProduct = searchParams.get("product") || "";
  const initialWebsite = searchParams.get("website") || "";
  const initialCompetitors = searchParams.get("competitors") || "";
  const initialSources = searchParams.get("sources") || "";
  const initialCustomFeedback = searchParams.get("customFeedback") || "";
  const paramAnalysisId = searchParams.get("analysisId") || "";

  const [productName, setProductName] = useState(initialProduct);
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState(paramAnalysisId);
  const [isPublic, setIsPublic] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isAddingMonitor, setIsAddingMonitor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (paramAnalysisId) {
      loadSavedAnalysis(paramAnalysisId);
    } else if (initialProduct) {
      const sources = initialSources ? initialSources.split(",") : undefined;
      runAnalysis(initialProduct, initialWebsite, initialCompetitors, sources, initialCustomFeedback || undefined);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSavedAnalysis = async (id: string) => {
    setIsLoading(true);
    setError(null);
    const { data: row, error: err } = await supabase
      .from("analyses")
      .select("*")
      .eq("id", id)
      .single();

    if (err || !row) {
      setError("Could not load saved analysis");
      toast({ title: "Load failed", description: err?.message || "Not found", variant: "destructive" });
    } else {
      setData(row.results as unknown as AnalysisResult);
      setProductName(row.product_name);
      setCurrentAnalysisId(row.id);
      setIsPublic((row as any).is_public ?? false);
      setIsSaved(true);
    }
    setIsLoading(false);
  };

  const runAnalysis = async (name: string, website?: string, competitors?: string, sources?: string[], customFeedback?: string) => {
    setIsLoading(true);
    setError(null);
    setIsSaved(false);
    setCurrentAnalysisId("");
    try {
      const result = await analyzeProduct({
        productName: name,
        website: website || undefined,
        competitors: competitors || undefined,
        sources,
        customFeedback,
      });
      setData(result);
      setProductName(result.productName);

      // If backend already persisted (logged-in user), mark as saved
      if (result.analysisId) {
        setCurrentAnalysisId(result.analysisId);
        setIsSaved(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setError(msg);
      toast({ title: "Analysis failed", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !data) {
      toast({ title: "Sign in to save", description: "Create an account to save analyses.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const { data: inserted, error: err } = await supabase.from("analyses").insert([{
      user_id: user.id,
      product_name: data.productName,
      website: initialWebsite || null,
      competitors: initialCompetitors || null,
      results: JSON.parse(JSON.stringify(data)),
    }]).select("id").single();
    if (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } else {
      setIsSaved(true);
      setCurrentAnalysisId(inserted.id);
      toast({ title: "Analysis saved!" });
    }
    setIsSaving(false);
  };

  const handleShare = async () => {
    if (!currentAnalysisId) return;
    const newPublic = !isPublic;
    const { error: err } = await supabase
      .from("analyses")
      .update({ is_public: newPublic } as any)
      .eq("id", currentAnalysisId);
    if (err) {
      toast({ title: "Failed to update sharing", description: err.message, variant: "destructive" });
      return;
    }
    setIsPublic(newPublic);
    if (newPublic) {
      const url = `${window.location.origin}/dashboard?analysisId=${currentAnalysisId}`;
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "Anyone with the link can view this analysis." });
    } else {
      toast({ title: "Sharing disabled", description: "This analysis is now private." });
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["Section", "Name", "Value"],
      ...data.complaints.map((c) => ["Complaint", c.name, c.mentions.toString()]),
      ...data.featureRequests.map((f) => ["Feature Request", f.name, f.mentions.toString()]),
      ...data.sentiment.map((s) => ["Sentiment", s.name, `${s.value}%`]),
      ...data.competitors.map((c) => ["Competitor", c.name, `${c.sentiment}/5 - ${c.weakness}`]),
      ...(data.opportunityScore || []).map((o) => ["Opportunity", o.name, `Score: ${o.score}, Mentions: ${o.mentions}`]),
      ["Recommendation", data.aiRecommendation, ""],
    ];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.productName}-analysis.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReanalyze = async () => {
    if (!data) return;
    setIsReanalyzing(true);
    try {
      const result = await analyzeProduct({
        productName: data.productName,
        website: initialWebsite || undefined,
        competitors: initialCompetitors || undefined,
        useCache: true,
      });
      setData(result);
      toast({ title: "Re-analysis complete", description: "Used cached data for faster results." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Re-analysis failed";
      toast({ title: "Re-analysis failed", description: msg, variant: "destructive" });
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleAddToMonitoring = async () => {
    if (!user || !data) return;
    setIsAddingMonitor(true);

    // Check for duplicates
    const { data: existing } = await supabase
      .from("monitored_products")
      .select("id")
      .eq("product_name", data.productName)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      toast({ title: "Already monitoring", description: `${data.productName} is already in your monitored products.` });
      setIsAddingMonitor(false);
      return;
    }

    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    const { error: err } = await supabase.from("monitored_products").insert({
      user_id: user.id,
      product_name: data.productName,
      website: initialWebsite || null,
      competitors: initialCompetitors || null,
      frequency: "daily",
      next_run_at: nextRun.toISOString(),
    });
    if (err) {
      toast({ title: "Failed to add", description: err.message, variant: "destructive" });
    } else {
      toast({ title: "Added to monitoring!", description: "You'll get alerts when feedback changes." });
    }
    setIsAddingMonitor(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (productName.trim()) runAnalysis(productName.trim());
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border h-14 flex items-center px-4 sm:px-6 glass sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2 mr-4 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-bold text-foreground hidden sm:inline">InsightPM</span>
        </Link>
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Enter product name..." className="pl-10 bg-secondary border-border h-9" />
          </div>
        </form>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {user && (
            <Link to="/history">
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden sm:inline-flex">
                <History className="w-4 h-4 mr-1" /> History
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground sm:hidden">
                <History className="w-4 h-4" />
              </Button>
            </Link>
          )}
          <Link to="/analyze"><Button variant="ghost" size="sm" className="text-muted-foreground hidden sm:inline-flex">New Analysis</Button></Link>
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
              <LogOut className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Sign Out</span>
            </Button>
          ) : (
            <Link to="/auth"><Button variant="ghost" size="sm" className="text-primary">Sign In</Button></Link>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isLoading && <AnalysisProgress productName={productName} />}

        {error && !isLoading && (
          <div className="text-center py-20">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Analysis Failed</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link to="/analyze"><Button variant="hero">Try Again</Button></Link>
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-20">
            <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">No Analysis Yet</h2>
            <p className="text-muted-foreground mb-6">Search for a product above or start a new analysis.</p>
            <Link to="/analyze"><Button variant="hero">Analyze a Product</Button></Link>
          </div>
        )}

        {data && !isLoading && (
          <>
            {/* Header + actions */}
            <motion.div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                  Analysis: <span className="text-gradient-primary">{data.productName}</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  {data.totalFeedback.toLocaleString()} feedback items analyzed from {data.sourcesCount} sources
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {!!user && !isSaved && (
                  <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
                    <Save className="w-4 h-4 mr-1" /> {isSaving ? "Saving..." : "Save"}
                  </Button>
                )}
                {isSaved && <span className="text-xs text-primary font-medium">✓ Saved</span>}
                {!!user && !!currentAnalysisId && (
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="w-4 h-4 mr-1" /> {isPublic ? "Unshare" : "Share"}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <FileText className="w-4 h-4 mr-1" /> PDF
                </Button>
                {isSaved && !!user && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleReanalyze} disabled={isReanalyzing} title="Re-run analysis using recently cached feedback data for faster results">
                      <RefreshCw className={`w-4 h-4 mr-1 ${isReanalyzing ? "animate-spin" : ""}`} />
                      {isReanalyzing ? "Re-analyzing..." : "Re-analyze (cached)"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleAddToMonitoring} disabled={isAddingMonitor}>
                      <Bell className="w-4 h-4 mr-1" />
                      {isAddingMonitor ? "Adding..." : "Add to Monitor"}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>

            <StatCards data={data} />
            <SourceChart sourceBreakdown={data.sourceBreakdown || []} />
            <ChartsGrid data={data} />
            <ClusterGrid clusters={data.clusters || []} />
            <OpportunityScores scores={data.opportunityScore || []} />

            {/* AI Recommendation */}
            <motion.div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">AI Recommendation</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{data.aiRecommendation}</p>
                </div>
              </div>
            </motion.div>

            <FeatureRequestsSection featureRequests={data.featureRequests} />
            <FeedbackSamplesSection samples={data.feedbackSamples || []} />
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
