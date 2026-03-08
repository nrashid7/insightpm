import { motion } from "framer-motion";
import type { FeatureRequest } from "@/lib/types/analysis";

interface FeatureRequestsProps {
  featureRequests: FeatureRequest[];
}

const FeatureRequestsSection = ({ featureRequests }: FeatureRequestsProps) => {
  const maxMentions = Math.max(...featureRequests.map((f) => f.mentions), 1);

  return (
    <motion.div className="mt-6 rounded-xl border border-border bg-card/50 p-4 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
      <h3 className="text-sm font-semibold text-foreground mb-4">Top Feature Requests</h3>
      <div className="space-y-3">
        {featureRequests.map((f, i) => (
          <div key={f.name} className="flex items-center gap-4">
            <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{f.name}</span>
                <span className="text-xs text-muted-foreground">{f.mentions.toLocaleString()} mentions</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(f.mentions / maxMentions) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default FeatureRequestsSection;
