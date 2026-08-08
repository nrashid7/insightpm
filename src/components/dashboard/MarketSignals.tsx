import { motion } from "framer-motion";
import { TrendingUp, ExternalLink, BarChart3, GitBranch, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MarketSignals as MarketSignalsType } from "@/lib/types/analysis";

interface MarketSignalsSectionProps {
  signals?: MarketSignalsType;
  industryBrief?: string;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  polymarket: { label: "Polymarket", color: "bg-violet-500/20 text-violet-400" },
  reddit: { label: "Reddit", color: "bg-orange-500/20 text-orange-400" },
  reddit_top: { label: "Reddit", color: "bg-orange-500/20 text-orange-400" },
  hackernews: { label: "HN", color: "bg-amber-500/20 text-amber-400" },
  github: { label: "GitHub", color: "bg-gray-500/20 text-gray-400" },
  youtube: { label: "YouTube", color: "bg-red-500/20 text-red-400" },
  tiktok: { label: "TikTok", color: "bg-pink-500/20 text-pink-400" },
  x: { label: "X", color: "bg-sky-500/20 text-sky-400" },
};

const MarketSignalsSection = ({ signals, industryBrief }: MarketSignalsSectionProps) => {
  if (!signals || (signals.signals.length === 0 && signals.predictionMarkets.length === 0 && signals.githubVelocity.length === 0)) {
    return null;
  }

  const brief = signals.industryBrief || industryBrief;

  return (
    <div className="mb-8 space-y-4">
      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Industry Signals
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Engagement-scored signals from the last 30 days — scored by upvotes, views, stars, and real money
        </p>
      </motion.div>

      {/* Industry Brief */}
      {brief && (
        <motion.div
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Industry Brief</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{brief}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Prediction Markets */}
      {signals.predictionMarkets.length > 0 && (
        <motion.div
          className="rounded-xl border border-border bg-card/50 p-4 sm:p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-400" />
            Prediction Markets
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Real money-backed odds from Polymarket</p>
          <div className="space-y-3">
            {signals.predictionMarkets.slice(0, 8).map((market, i) => {
              const probColor = market.probability >= 70
                ? "text-chart-4"
                : market.probability >= 40
                  ? "text-accent"
                  : "text-muted-foreground";

              return (
                <div key={i} className="flex items-start gap-3">
                  <span className={`text-lg font-bold tabular-nums shrink-0 w-14 text-right ${probColor}`}>
                    {market.probability}%
                  </span>
                  <div className="flex-1 min-w-0">
                    <a
                      href={market.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                    >
                      {market.question}
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                    </a>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-1.5">
                      <div
                        className="h-full rounded-full bg-violet-500/70 transition-all"
                        style={{ width: `${market.probability}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {market.volume > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          ${Math.round(market.volume).toLocaleString()} volume
                        </span>
                      )}
                      {market.endDate && (
                        <span className="text-[10px] text-muted-foreground">
                          Ends {new Date(market.endDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* GitHub Velocity */}
      {signals.githubVelocity.length > 0 && (
        <motion.div
          className="rounded-xl border border-border bg-card/50 p-4 sm:p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
        >
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-gray-400" />
            GitHub Velocity
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Repository activity in the last 30 days</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {signals.githubVelocity.slice(0, 6).map((repo, i) => (
              <a
                key={i}
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border bg-card/30 p-3 hover:border-primary/30 transition-colors block"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground truncate">{repo.repo}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground opacity-50" />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{repo.stars.toLocaleString()} stars</span>
                  <span>{repo.recentPRs} PRs merged</span>
                  {repo.latestRelease && <span>v{repo.latestRelease.replace(/^v/i, "")}</span>}
                </div>
              </a>
            ))}
          </div>
        </motion.div>
      )}

      {/* Top Engagement-Scored Signals */}
      {signals.signals.length > 0 && (
        <motion.div
          className="rounded-xl border border-border bg-card/50 p-4 sm:p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Top Signals by Engagement
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Ranked by community engagement (upvotes, views, stars)</p>
          <div className="space-y-2.5">
            {signals.signals.slice(0, 15).map((signal, i) => {
              const srcInfo = SOURCE_LABELS[signal.source] || { label: signal.source, color: "bg-muted text-muted-foreground" };
              return (
                <div key={i} className="flex items-start gap-3 py-1">
                  <span className="text-xs font-mono text-muted-foreground w-4 shrink-0 pt-0.5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <Badge className={`text-[10px] ${srcInfo.color}`}>{srcInfo.label}</Badge>
                      <Badge variant="outline" className="text-[10px]">{signal.normalizedScore}/100</Badge>
                    </div>
                    {signal.url ? (
                      <a
                        href={signal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-foreground hover:text-primary transition-colors line-clamp-2"
                      >
                        {signal.title}
                      </a>
                    ) : (
                      <span className="text-sm text-foreground line-clamp-2">{signal.title}</span>
                    )}
                    {signal.author && (
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">by {signal.author}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MarketSignalsSection;
