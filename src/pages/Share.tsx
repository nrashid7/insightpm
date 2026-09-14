import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult } from "@/lib/types/analysis";
import AnalysisResultsView from "@/components/dashboard/AnalysisResultsView";
import AnalysisProgress from "@/components/dashboard/AnalysisProgress";

const Share = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [productName, setProductName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setProductName("");
    if (!analysisId) {
      setError("Invalid share link");
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError(null);
      const { data: row, error: err } = await supabase
        .from("analyses")
        .select("product_name, results, is_public")
        .eq("id", analysisId)
        .eq("is_public", true)
        .single();

      if (cancelled) return;
      if (err || !row) {
        setError("This analysis is not available. It may be private or removed.");
      } else {
        setData(row.results as unknown as AnalysisResult);
        setProductName(row.product_name);
      }
      setIsLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [analysisId]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border h-14 flex items-center px-4 sm:px-6 glass sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2 mr-4 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-bold text-foreground">InsightPM</span>
        </Link>
        <span className="text-xs text-muted-foreground hidden sm:inline">Shared analysis</span>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="text-muted-foreground">Sign In</Button>
          </Link>
          <Link to="/analyze">
            <Button variant="hero" size="sm">
              Analyze your product
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isLoading && <AnalysisProgress productName={productName || "Loading..."} />}

        {error && !isLoading && (
          <div className="text-center py-20">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Analysis Unavailable</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link to="/"><Button variant="hero">Go Home</Button></Link>
          </div>
        )}

        {data && !isLoading && !error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AnalysisResultsView data={data} readOnly />
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Share;
