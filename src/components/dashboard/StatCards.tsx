import { motion } from "framer-motion";
import { MessageSquare, Star, TrendingDown, TrendingUp } from "lucide-react";
import type { AnalysisResult } from "@/lib/types/analysis";

interface StatCardsProps {
  data: AnalysisResult;
}

const StatCards = ({ data }: StatCardsProps) => {
  const stats = [
    { icon: MessageSquare, label: "Total Feedback", value: data.totalFeedback.toLocaleString(), color: "text-primary" },
    { icon: Star, label: "Avg Sentiment", value: `${data.avgSentiment}/5`, color: "text-accent" },
    { icon: TrendingDown, label: "Top Complaints", value: data.topComplaintsCount.toLocaleString(), color: "text-destructive" },
    { icon: TrendingUp, label: "Feature Requests", value: data.topFeatureRequestCount.toLocaleString(), color: "text-chart-4" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
      {stats.map((stat) => (
        <motion.div key={stat.label} className="rounded-xl border border-border bg-card/50 p-4 sm:p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</div>
        </motion.div>
      ))}
    </div>
  );
};

export default StatCards;
