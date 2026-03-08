import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ClusterData } from "@/lib/types/analysis";

interface ClusterGridProps {
  clusters: ClusterData[];
}

const ClusterGrid = ({ clusters }: ClusterGridProps) => {
  if (!clusters || clusters.length === 0) return null;

  return (
    <motion.div className="mb-8 rounded-xl border border-border bg-card/50 p-4 sm:p-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}>
      <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" /> Feedback Clusters
      </h3>
      <p className="text-xs text-muted-foreground mb-4">Similar feedback grouped by theme</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {clusters.slice(0, 12).map((cluster, i) => {
          const sentimentColor = {
            positive: "bg-chart-4/20 text-chart-4",
            negative: "bg-destructive/20 text-destructive",
            neutral: "bg-muted text-muted-foreground",
            feature_request: "bg-primary/20 text-primary",
            bug: "bg-destructive/20 text-destructive",
            pricing: "bg-accent/20 text-accent",
            performance: "bg-chart-5/20 text-chart-5",
          }[cluster.avgSentiment] || "bg-muted text-muted-foreground";

          return (
            <div key={i} className="rounded-lg border border-border bg-card/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{cluster.name}</span>
                <Badge variant="outline" className="text-[10px]">{cluster.count}</Badge>
              </div>
              <Badge className={`text-[10px] mb-2 ${sentimentColor}`}>
                {cluster.avgSentiment.replace("_", " ")}
              </Badge>
              {cluster.samples && cluster.samples.length > 0 && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1 italic">
                  "{cluster.samples[0]}"
                </p>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ClusterGrid;
