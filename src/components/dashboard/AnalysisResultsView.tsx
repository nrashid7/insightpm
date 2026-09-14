import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import type { AnalysisResult } from "@/lib/types/analysis";
import StatCards from "@/components/dashboard/StatCards";
import SourceChart from "@/components/dashboard/SourceChart";
import ChartsGrid from "@/components/dashboard/ChartsGrid";
import ClusterGrid from "@/components/dashboard/ClusterGrid";
import OpportunityScores from "@/components/dashboard/OpportunityScores";
import FeatureRequestsSection from "@/components/dashboard/FeatureRequests";
import FeedbackSamplesSection from "@/components/dashboard/FeedbackSamples";
import MarketSignalsSection from "@/components/dashboard/MarketSignals";

interface AnalysisResultsViewProps {
  data: AnalysisResult;
  readOnly?: boolean;
}

const AnalysisResultsView = ({ data }: AnalysisResultsViewProps) => (
  <>
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
        Analysis: <span className="text-gradient-primary">{data.productName}</span>
      </h1>
      <p className="text-sm text-muted-foreground">
        {data.totalFeedback.toLocaleString()} feedback items analyzed from {data.sourcesCount} sources
      </p>
    </motion.div>

    {data.warnings?.length ? <aside className="mb-6 rounded-xl border border-border p-4 text-sm text-muted-foreground" aria-label="Evidence limitations">
      <p className="font-semibold text-foreground">Evidence and coverage</p>
      {data.researchWindow && <p>Research window: {data.researchWindow.days} days. Undated submissions are identified separately.</p>}
      <ul className="list-disc pl-5">{data.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
    </aside> : null}
    <StatCards data={data} />
    <SourceChart sourceBreakdown={data.sourceBreakdown || []} />
    <ChartsGrid data={data} />
    <MarketSignalsSection signals={data.marketSignals} industryBrief={data.industryBrief} />
    <ClusterGrid clusters={data.clusters || []} />
    <OpportunityScores scores={data.opportunityScore || []} />

    <motion.div
      className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Suggested next step</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{data.aiRecommendation}</p>
        </div>
      </div>
    </motion.div>

    <FeatureRequestsSection featureRequests={data.featureRequests} />
    <FeedbackSamplesSection samples={data.feedbackSamples || []} />
    {data.evidence?.length ? <details className="mt-6 rounded-xl border border-border p-4">
      <summary className="cursor-pointer font-semibold">All supporting evidence ({data.evidence.length})</summary>
      <ol className="space-y-4 mt-4">{data.evidence.map(item => <li key={item.id} id={item.id} className="text-sm">
        <p className="text-muted-foreground">{item.id} · {item.source} · {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Date unknown'}</p>
        <p className="whitespace-pre-wrap">{item.text}</p>
        {item.url && /^https?:\/\//i.test(item.url) && <a className="text-primary underline" href={item.url} target="_blank" rel="noopener noreferrer">View source</a>}
      </li>)}</ol>
    </details> : null}
  </>
);

export default AnalysisResultsView;
