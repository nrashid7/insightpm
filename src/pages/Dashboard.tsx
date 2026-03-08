import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Search, ArrowLeft, TrendingDown, TrendingUp, MessageSquare, Users, Star, AlertTriangle, Save, Download, History, Share2, FileText, LogOut } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Tooltip } from "recharts";
import { analyzeProduct } from "@/lib/api/analyze";
import type { AnalysisResult } from "@/lib/types/analysis";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const initialProduct = searchParams.get("product") || "";
  const initialWebsite = searchParams.get("website") || "";
  const initialCompetitors = searchParams.get("competitors") || "";
  const analysisId = searchParams.get("analysisId") || "";

  const [productName, setProductName] = useState(initialProduct);
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState(analysisId);
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (analysisId) {
      loadSavedAnalysis(analysisId);
    } else if (initialProduct) {
      runAnalysis(initialProduct, initialWebsite, initialCompetitors);
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
      setIsPublic(row.is_public ?? false);
      setIsSaved(true);
    }
    setIsLoading(false);
  };

  const runAnalysis = async (name: string, website?: string, competitors?: string) => {
    setIsLoading(true);
    setError(null);
    setIsSaved(false);
    setCurrentAnalysisId("");
    try {
      const result = await analyzeProduct({
        productName: name,
        website: website || undefined,
        competitors: competitors || undefined,
      });
      setData(result);
      setProductName(result.productName);
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
      .update({ is_public: newPublic })
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

  const handleExportPDF = () => {
    window.print();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (productName.trim()) {
      runAnalysis(productName.trim());
    }
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
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Enter product name..."
              className="pl-10 bg-secondary border-border h-9"
            />
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
          <Link to="/analyze">
            <Button variant="ghost" size="sm" className="text-muted-foreground hidden sm:inline-flex">New Analysis</Button>
          </Link>
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
              <LogOut className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-primary">Sign In</Button>
            </Link>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isLoading && <LoadingSkeleton productName={productName} />}

        {error && !isLoading && (
          <div className="text-center py-20">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Analysis Failed</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link to="/analyze">
              <Button variant="hero">Try Again</Button>
            </Link>
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-20">
            <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">No Analysis Yet</h2>
            <p className="text-muted-foreground mb-6">Search for a product above or start a new analysis.</p>
            <Link to="/analyze">
              <Button variant="hero">Analyze a Product</Button>
            </Link>
          </div>
        )}

        {data && !isLoading && (
          <AnalysisResults
            data={data}
            onSave={handleSave}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            onShare={handleShare}
            isSaving={isSaving}
            isSaved={isSaved}
            isLoggedIn={!!user}
            isPublic={isPublic}
            hasAnalysisId={!!currentAnalysisId}
          />
        )}
      </main>
    </div>
  );
};

const LoadingSkeleton = ({ productName }: { productName: string }) => (
  <>
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-foreground mb-1">
        Analyzing: <span className="text-gradient-primary">{productName}</span>
      </h1>
      <p className="text-sm text-muted-foreground">Scanning feedback sources and generating insights...</p>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
    </div>
    <div className="grid lg:grid-cols-2 gap-6 mb-8">
      {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
    </div>
    <Skeleton className="h-32 rounded-xl" />
  </>
);

interface AnalysisResultsProps {
  data: AnalysisResult;
  onSave: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onShare: () => void;
  isSaving: boolean;
  isSaved: boolean;
  isLoggedIn: boolean;
  isPublic: boolean;
  hasAnalysisId: boolean;
}

const AnalysisResults = ({ data, onSave, onExportCSV, onExportPDF, onShare, isSaving, isSaved, isLoggedIn, isPublic, hasAnalysisId }: AnalysisResultsProps) => {
  const maxFeatureMentions = Math.max(...data.featureRequests.map((f) => f.mentions), 1);

  return (
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
          {isLoggedIn && !isSaved && (
            <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-1" /> {isSaving ? "Saving..." : "Save"}
            </Button>
          )}
          {isSaved && (
            <span className="text-xs text-primary font-medium">✓ Saved</span>
          )}
          {isLoggedIn && hasAnalysisId && (
            <Button variant="outline" size="sm" onClick={onShare}>
              <Share2 className="w-4 h-4 mr-1" /> {isPublic ? "Unshare" : "Share"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onExportCSV}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={onExportPDF}>
            <FileText className="w-4 h-4 mr-1" /> PDF
          </Button>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[
          { icon: MessageSquare, label: "Total Feedback", value: data.totalFeedback.toLocaleString(), color: "text-primary" },
          { icon: Star, label: "Avg Sentiment", value: `${data.avgSentiment}/5`, color: "text-accent" },
          { icon: TrendingDown, label: "Top Complaints", value: data.topComplaintsCount.toLocaleString(), color: "text-destructive" },
          { icon: TrendingUp, label: "Feature Requests", value: data.topFeatureRequestCount.toLocaleString(), color: "text-chart-4" },
        ].map((stat) => (
          <motion.div key={stat.label} className="rounded-xl border border-border bg-card/50 p-4 sm:p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <motion.div className="rounded-xl border border-border bg-card/50 p-4 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-accent" /> Top Complaints
          </h3>
          <p className="text-xs text-muted-foreground mb-4">By mention count across all sources</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.complaints} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={110} tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Bar dataKey="mentions" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="rounded-xl border border-border bg-card/50 p-4 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h3 className="text-sm font-semibold text-foreground mb-1">Sentiment Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-4">Overall sentiment distribution</p>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={data.sentiment} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} strokeWidth={0}>
                  {data.sentiment.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {data.sentiment.map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm text-muted-foreground">{s.name}</span>
                  <span className="text-sm font-semibold text-foreground ml-auto">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div className="rounded-xl border border-border bg-card/50 p-4 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-chart-4" /> Feature Request Trend
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Monthly request volume</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.trendData}>
              <XAxis dataKey="month" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "hsl(222, 44%, 8%)", border: "1px solid hsl(222, 20%, 16%)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "hsl(210, 40%, 96%)" }} />
              <Line type="monotone" dataKey="requests" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="rounded-xl border border-border bg-card/50 p-4 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Users className="w-4 h-4 text-chart-5" /> Competitor Intel
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Key competitor weaknesses</p>
          <div className="space-y-3">
            {data.competitors.length > 0 ? (
              data.competitors.map((c) => (
                <div key={c.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <div className="text-sm font-medium text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.weakness}</div>
                  </div>
                  <div className="text-sm font-mono text-accent">{c.sentiment}/5</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No competitors analyzed.</p>
            )}
          </div>
        </motion.div>
      </div>

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

      {/* Top Feature Requests */}
      <motion.div className="mt-6 rounded-xl border border-border bg-card/50 p-4 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
        <h3 className="text-sm font-semibold text-foreground mb-4">Top Feature Requests</h3>
        <div className="space-y-3">
          {data.featureRequests.map((f, i) => (
            <div key={f.name} className="flex items-center gap-4">
              <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{f.mentions.toLocaleString()} mentions</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(f.mentions / maxFeatureMentions) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
};

export default Dashboard;
