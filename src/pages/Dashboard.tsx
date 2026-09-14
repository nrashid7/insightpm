import { useState, useEffect, useRef } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Zap, Search, Save, Download, History, Share2, FileText, LogOut,
  AlertTriangle, RefreshCw, Bell,
} from "lucide-react";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { analyzeProduct } from "@/lib/api/analyze";
import { trackEvent } from "@/lib/analytics";
import type { AnalysisInput, AnalysisResult } from "@/lib/types/analysis";
import { BILLING_ENABLED } from "@/lib/product-config";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import AnalysisProgress from "@/components/dashboard/AnalysisProgress";
import AnalysisResultsView from "@/components/dashboard/AnalysisResultsView";

const DashboardContent = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const draft = (location.state as { analysisInput?: AnalysisInput } | null)?.analysisInput;
  const { isActive, analysesRemaining, loading: accessLoading, error: accessError, refresh } = useSubscription();
  const initialProduct = draft?.productName || searchParams.get("product") || "";
  const initialWebsite = draft?.website || "";
  const initialCompetitors = draft?.competitors || "";
  const initialSources = searchParams.get("sources") || "";
  const initialCustomFeedback = draft?.customFeedback || "";
  const initialMarketSignals = draft?.includeMarketSignals ?? false;
  const initialMarketSources = searchParams.get("marketSources") || "";
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
  const startedRequest = useRef("");
  const savedByThisPage = useRef("");
  const runInFlight = useRef(false);
  const [analysisInput, setAnalysisInput] = useState<AnalysisInput | null>(draft || null);
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (paramAnalysisId) {
      if (savedByThisPage.current === paramAnalysisId || startedRequest.current === paramAnalysisId) return;
      startedRequest.current = paramAnalysisId;
      loadSavedAnalysis(paramAnalysisId);
    } else if (initialProduct) {
      if (accessLoading) return;
      const requestKey = location.key + initialProduct;
      if (startedRequest.current === requestKey) return;
      startedRequest.current = requestKey;
      if (!isActive) {
        setError(accessError || (BILLING_ENABLED ? "An active subscription is required to run analyses." : "Could not verify beta access. Please reload and try again."));
        return;
      }
      if (analysesRemaining <= 0) {
        setError("Monthly analysis limit reached. Please try again next month.");
        return;
      }
      const sources = draft?.sources ?? (initialSources ? initialSources.split(",") : undefined);
      const mktSources = draft?.marketSignalSources ?? (initialMarketSources ? initialMarketSources.split(",") : undefined);
      runAnalysis(initialProduct, initialWebsite, initialCompetitors, sources, initialCustomFeedback || undefined, initialMarketSignals, mktSources);
    }
  }, [paramAnalysisId, initialProduct, accessLoading, isActive, analysesRemaining, location.key]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setIsPublic((row as unknown as { is_public?: boolean }).is_public ?? false);
      setIsSaved(true);
      const savedResult = row.results as unknown as AnalysisResult;
      setAnalysisInput({
        productName: row.product_name, website: row.website || undefined, competitors: row.competitors || undefined,
        sources: savedResult.sourceBreakdown?.map(source => source.source),
        customFeedback: savedResult.evidence?.filter(item => item.source === 'custom').map(item => item.text).join('\n') || undefined,
        days: savedResult.researchWindow?.days ?? 30,
        includeMarketSignals: Boolean(savedResult.marketSignals),
        marketSignalSources: savedResult.marketSignals?.sourceBreakdown.map(source => source.source),
      });
    }
    setIsLoading(false);
  };

  const runAnalysis = async (name: string, website?: string, competitors?: string, sources?: string[], customFeedback?: string, includeMarketSignals?: boolean, marketSignalSources?: string[]) => {
    if (runInFlight.current) return;
    runInFlight.current = true;
    setIsLoading(true);
    setError(null);
    setIsSaved(false);
    setCurrentAnalysisId("");
    setIsPublic(false);
    setData(null);
    const input: AnalysisInput = { productName: name, website: website || undefined, competitors: competitors || undefined, sources, customFeedback, includeMarketSignals, marketSignalSources, days: draft?.days ?? 30 };
    setAnalysisInput(input);
    try {
      const result = await analyzeProduct(input);
      setData(result);
      trackEvent("analysis_complete", { product: result.productName, sources: result.sourcesCount });
      setProductName(result.productName);

      // If backend already persisted (logged-in user), mark as saved
      if (result.analysisId) {
        setCurrentAnalysisId(result.analysisId);
        setIsSaved(true);
        savedByThisPage.current = result.analysisId;
        navigate(`/dashboard?analysisId=${result.analysisId}`, { replace: true, state: null });
      }
      void refresh?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setError(msg);
      trackEvent("analysis_failed", { product: name });
      toast({ title: "Analysis failed", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
      runInFlight.current = false;
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
      website: analysisInput?.website || null,
      competitors: analysisInput?.competitors || null,
      results: JSON.parse(JSON.stringify(data)),
    }]).select("id").single();
    if (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } else {
      setIsSaved(true);
      setCurrentAnalysisId(inserted.id);
      savedByThisPage.current = inserted.id;
      navigate(`/dashboard?analysisId=${inserted.id}`, { replace: true, state: null });
      trackEvent("analysis_saved", { product: data.productName });
      toast({ title: "Analysis saved!" });
    }
    setIsSaving(false);
  };

  const handleShare = async () => {
    if (!currentAnalysisId) return;
    const newPublic = !isPublic;
    const { error: err } = await supabase
      .from("analyses")
      .update({ is_public: newPublic })
      .eq("id", currentAnalysisId);
    if (err) {
      toast({ title: "Failed to update sharing", description: err.message, variant: "destructive" });
      return;
    }
    setIsPublic(newPublic);
    trackEvent("analysis_shared", { product: data?.productName || "", public: newPublic });
    if (newPublic) {
      const url = `${window.location.origin}/share/${currentAnalysisId}`;
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied!", description: "Anyone with the link can view this analysis." });
      } catch {
        toast({ title: "Sharing enabled", description: url });
      }
    } else {
      toast({ title: "Sharing disabled", description: "This analysis is now private." });
    }
  };

  const handleExportPDF = () => {
    if (!data) return;
    const style = document.createElement("style");
    style.textContent = `
      @media print {
        header, button, form, .no-print { display: none !important; }
        body { background: white !important; color: black !important; }
        * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  const handleExportCSV = () => {
    if (!data) return;
    trackEvent("export_csv", { product: data.productName });
    const rows = [
      ["Section", "Name", "Value"],
      ...data.complaints.map((c) => ["Complaint", c.name, c.mentions.toString()]),
      ...data.featureRequests.map((f) => ["Feature Request", f.name, f.mentions.toString()]),
      ...data.sentiment.map((s) => ["Sentiment", s.name, `${s.value}%`]),
      ...data.competitors.map((c) => ["Competitor", c.name, `${c.sentiment}/5 - ${c.weakness}`]),
      ...(data.opportunityScore || []).map((o) => ["Opportunity", o.name, `Score: ${o.score}, Mentions: ${o.mentions}`]),
      ...(data.marketSignals?.predictionMarkets || []).map((m) => ["Prediction Market", m.question, `${m.probability}% Yes ($${Math.round(m.volume).toLocaleString()} volume)`]),
      ...(data.marketSignals?.githubVelocity || []).map((g) => ["GitHub Velocity", g.repo, `${g.stars.toLocaleString()} stars, ${g.recentPRs} PRs merged${g.latestRelease ? `, latest: ${g.latestRelease}` : ""}`]),
      ...(data.marketSignals?.signals || []).slice(0, 15).map((s) => ["Market Signal", `[${s.source}] ${s.title}`, `Score: ${s.normalizedScore}/100, Engagement: ${s.engagement}`]),
      ["Recommendation", data.aiRecommendation, ""],
      ...(data.marketSignals?.industryBrief ? [["Industry Brief", data.marketSignals.industryBrief, ""]] : []),
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
    if (!isActive || analysesRemaining <= 0) {
      toast({ title: "Cannot re-analyze", description: "Active subscription with remaining analyses required.", variant: "destructive" });
      return;
    }
    setIsReanalyzing(true);
    try {
      const result = await analyzeProduct({
        ...analysisInput,
        productName: data.productName,
        includeMarketSignals: analysisInput?.includeMarketSignals ?? false,
        useCache: true,
      });
      setData(result);
      setCurrentAnalysisId(result.analysisId || "");
      setIsSaved(!!result.analysisId);
      setIsPublic(false);
      if (result.analysisId) {
        savedByThisPage.current = result.analysisId;
        navigate(`/dashboard?analysisId=${result.analysisId}`, { replace: true, state: null });
      }
      void refresh?.();
      toast({ title: "Re-analysis complete", description: "A new analysis was saved." });
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
      website: analysisInput?.website || null,
      competitors: analysisInput?.competitors || null,
      frequency: "daily",
      next_run_at: nextRun.toISOString(),
    });
    if (err) {
      toast({ title: "Failed to add", description: err.message, variant: "destructive" });
    } else {
      toast({ title: "Added to monitoring!", description: "You'll get alerts when feedback changes." });
      trackEvent("monitoring_added", { product: data.productName });
    }
    setIsAddingMonitor(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessLoading || isLoading || isReanalyzing) return;
    if (!productName.trim()) return;
    if (!isActive) {
      setError("An active subscription is required to run analyses.");
      toast({ title: "Access unavailable", description: accessError || "Please reload and try again.", variant: "destructive" });
      return;
    }
    if (analysesRemaining <= 0) {
      setError("Monthly analysis limit reached. Please try again next month.");
      toast({ title: "Limit reached", description: "Your monthly analysis allowance has been used.", variant: "destructive" });
      return;
    }
    runAnalysis(productName.trim());
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
        {(isLoading || (accessLoading && !!initialProduct)) && <AnalysisProgress productName={productName} />}

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

        {data && !isLoading && !error && (
          <>
            <motion.div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
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
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <FileText className="w-4 h-4 mr-1" /> PDF
                </Button>
                {isSaved && !!user && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleReanalyze} disabled={isReanalyzing} title="Run a new analysis">
                      <RefreshCw className={`w-4 h-4 mr-1 ${isReanalyzing ? "animate-spin" : ""}`} />
                      {isReanalyzing ? "Re-analyzing..." : "Re-analyze"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleAddToMonitoring} disabled={isAddingMonitor}>
                      <Bell className="w-4 h-4 mr-1" />
                      {isAddingMonitor ? "Adding..." : "Add to Monitor"}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>

            <AnalysisResultsView data={data} />
          </>
        )}
      </main>
    </div>
  );
};

const Dashboard = () => (
  <RequireAuth>
    <DashboardContent />
  </RequireAuth>
);

export default Dashboard;
