import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SOURCE_LABELS } from "./SourceChart";
import type { FeedbackSample } from "@/lib/types/analysis";

interface FeedbackSamplesProps {
  samples: FeedbackSample[];
}

const FeedbackSamplesSection = ({ samples }: FeedbackSamplesProps) => {
  const [samplesOpen, setSamplesOpen] = useState(false);

  if (!samples || samples.length === 0) return null;

  return (
    <motion.div className="mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
      <Collapsible open={samplesOpen} onOpenChange={setSamplesOpen}>
        <CollapsibleTrigger className="w-full rounded-xl border border-border bg-card/50 p-4 sm:p-6 flex items-center justify-between hover:bg-card/70 transition-colors">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            Real Feedback Samples ({samples.length})
          </h3>
          {samplesOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-2">
            {samples.map((sample, i) => {
              const info = SOURCE_LABELS[sample.source] || { label: sample.source, icon: "📄" };
              return (
                <div key={i} className="rounded-lg border border-border bg-card/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs">{info.icon}</span>
                    <Badge variant="secondary" className="text-[10px]">{info.label}</Badge>
                    {sample.rating && (
                      <span className="text-xs text-accent">{"★".repeat(sample.rating)}</span>
                    )}
                    {sample.url && (
                      <a href={sample.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-muted-foreground hover:text-primary">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {sample.title && (
                    <p className="text-xs font-medium text-foreground mb-1">{sample.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{sample.text}</p>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
};

export default FeedbackSamplesSection;
