import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trash2, Clock, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 20;

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
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SavedAnalysis | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      loadAnalyses(0);
    };
    checkAuth();
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAnalyses = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE;

    const { data, error } = await supabase
      .from("analyses")
      .select("id, product_name, website, competitors, created_at, results")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      toast({ title: "Failed to load history", description: error.message, variant: "destructive" });
    } else {
      const valid = (data || []).filter((a) => {
        const r = a.results as Record<string, unknown> | null;
        return r && Object.keys(r).length > 1;
      });
      setHasMore((data || []).length > PAGE_SIZE);
      setAnalyses(valid.slice(0, PAGE_SIZE));
      setPage(pageNum);
    }
    setIsLoading(false);
  }, [toast]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    await deleteAnalysis(id);
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
          <>
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
                      onClick={() => setDeleteTarget(a)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            {(page > 0 || hasMore) && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => loadAnalyses(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {page + 1}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasMore}
                  onClick={() => loadAnalyses(page + 1)}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete analysis?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the saved analysis for {deleteTarget?.product_name}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default History;
