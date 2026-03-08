import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Search, Layers, Zap } from "lucide-react";

interface AnalysisProgressProps {
  productName: string;
}

const STAGES = [
  { label: "Collecting feedback from sources...", icon: Search, duration: 15 },
  { label: "Classifying and clustering feedback...", icon: Layers, duration: 10 },
  { label: "Generating AI insights...", icon: Zap, duration: 999 },
];

const SOURCE_NAMES = ["Hacker News", "GitHub", "Stack Overflow", "App Store", "Reddit", "Trustpilot", "Web"];

const AnalysisProgress = ({ productName }: AnalysisProgressProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  let currentStage = 0;
  let cumulative = 0;
  for (let i = 0; i < STAGES.length; i++) {
    cumulative += STAGES[i].duration;
    if (elapsed < cumulative) { currentStage = i; break; }
    if (i === STAGES.length - 1) currentStage = i;
  }

  const StageIcon = STAGES[currentStage].icon;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Analyzing: <span className="text-gradient-primary">{productName}</span>
        </h1>
        <div className="flex items-center gap-2 mt-3">
          <motion.div
            key={currentStage}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-sm text-primary font-medium"
          >
            <StageIcon className="w-4 h-4 animate-pulse" />
            {STAGES[currentStage].label}
          </motion.div>
          <span className="text-xs text-muted-foreground ml-auto">{elapsed}s</span>
        </div>

        {/* Stage progress dots */}
        <div className="flex items-center gap-1 mt-3">
          {STAGES.map((stage, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full transition-colors ${
                i < currentStage ? "bg-primary" : i === currentStage ? "bg-primary animate-pulse" : "bg-muted"
              }`} />
              {i < STAGES.length - 1 && (
                <div className={`w-8 h-0.5 ${i < currentStage ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {currentStage === 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {SOURCE_NAMES.map((s, i) => (
              <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
                Scanning {s}...
              </span>
            ))}
          </div>
        )}
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
};

export default AnalysisProgress;
