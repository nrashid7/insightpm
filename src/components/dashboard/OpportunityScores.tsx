import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OpportunityScore as OpportunityScoreType } from "@/lib/types/analysis";

interface OpportunityScoresProps {
  scores: OpportunityScoreType[];
}

const OpportunityScores = ({ scores }: OpportunityScoresProps) => {
  if (!scores || scores.length === 0) return null;

  return (
    <motion.div className="mb-8 rounded-xl border border-border bg-card/50 p-4 sm:p-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
      <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" /> Product Opportunities
      </h3>
      <p className="text-xs text-muted-foreground mb-4">Ranked by opportunity score based on demand, complaints, and sentiment</p>
      <div className="space-y-3">
        {scores.sort((a, b) => b.score - a.score).map((opp, i) => {
          const scoreColor = opp.score >= 70 ? "text-chart-4" : opp.score >= 40 ? "text-accent" : "text-muted-foreground";
          const scoreLevel = opp.score >= 70 ? "High" : opp.score >= 40 ? "Medium" : "Low";
          return (
            <div key={opp.name} className="flex items-center gap-4">
              <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{opp.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{opp.mentions.toLocaleString()} mentions</span>
                    <Badge variant="outline" className={`text-[10px] ${scoreColor}`}>
                      {scoreLevel} ({opp.score})
                    </Badge>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${opp.score}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default OpportunityScores;
