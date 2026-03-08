import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trash2, Clock, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface SavedAnalysis {
  id: string;
  product_name: string;
  website: string | null;
  competitors: string | null;
  created_at: string;
}

const History = () => {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      loadAnalyses();
    };
    checkAuth();
  }, [navigate]);

  const loadAnalyses = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("analyses")
      .select("id, product_name, website, competitors, created_at, results")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load history", description: error.message, variant: "destructive" });
    } else {
      // Filter out empty placeholder analyses (failed mid-pipeline)
      const valid = (data || []).filter((a) => {
        const r = a.results as Record<string, unknown> | null;
        return r && Object.keys(r).length > 1;
      });
      setAnalyses(valid);
    }
    setIsLoading(false);
  };

  const deleteAnalysis = async (id: string) => {
    const { error } = await supabase.from("analyses").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Analysis deleted" });
    }
  };

  const viewAnalysis = (id: string) => {
    navigate(`/dashboard?analysisId=${id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-6 py-8 pt-24 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Analysis <span className="text-gradient-primary">History</span>
          </h1>
          <p className="text-sm text-muted-foreground mb-8">Your saved product analyses</p>
        </motion.div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && analyses.length === 0 && (
          <div className="text-center py-20">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No analyses yet</h2>
            <p className="text-muted-foreground mb-6">Run your first product analysis to see it here.</p>
            <Link to="/analyze">
              <Button variant="hero">Analyze a Product</Button>
            </Link>
          </div>
        )}

        {!isLoading && analyses.length > 0 && (
          <div className="space-y-3">
            {analyses.map((a, i) => (
              <motion.div
                key={a.id}
                className="rounded-xl border border-border bg-card/50 p-5 flex items-center justify-between group hover:border-primary/30 transition-colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground truncate">{a.product_name}</span>
                    {a.website && (
                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        · {a.website}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(a.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {a.competitors && <span>· vs {a.competitors}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => viewAnalysis(a.id)}
                    className="text-primary"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAnalysis(a.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
