import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { SourceBreakdown } from "@/lib/types/analysis";

const SOURCE_LABELS: Record<string, { label: string; icon: string }> = {
  hackernews: { label: "Hacker News", icon: "🟠" },
  github: { label: "GitHub", icon: "🐙" },
  stackoverflow: { label: "Stack Overflow", icon: "📚" },
  appstore: { label: "App Store", icon: "🍎" },
  reddit: { label: "Reddit", icon: "🔴" },
  trustpilot: { label: "Trustpilot", icon: "⭐" },
  web: { label: "Web", icon: "🌐" },
  youtube: { label: "YouTube", icon: "▶️" },
  googleplay: { label: "Google Play", icon: "🤖" },
  custom: { label: "Custom", icon: "📋" },
};

export { SOURCE_LABELS };

interface SourceChartProps {
  sourceBreakdown: SourceBreakdown[];
}

const SourceChart = ({ sourceBreakdown }: SourceChartProps) => {
  if (!sourceBreakdown || sourceBreakdown.length === 0) return null;

  return (
    <motion.div className="mb-8 rounded-xl border border-border bg-card/50 p-4 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
      <h3 className="text-sm font-semibold text-foreground mb-3">Sources Scanned</h3>
      <ResponsiveContainer width="100%" height={Math.max(160, sourceBreakdown.length * 36)}>
        <BarChart
          data={sourceBreakdown.map((s) => ({
            ...s,
            label: (SOURCE_LABELS[s.source] || { label: s.source }).label,
          }))}
          layout="vertical"
          margin={{ left: 10 }}
        >
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" width={100} tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "hsl(222, 44%, 8%)", border: "1px solid hsl(222, 20%, 16%)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "hsl(210, 40%, 96%)" }} />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
      <ul className="mt-3 space-y-2 text-xs text-muted-foreground" aria-label="Source collection status">
        {sourceBreakdown.map(source => <li key={source.source}>
          <span className="font-medium">{SOURCE_LABELS[source.source]?.label || source.source}</span>: {source.status || 'Collected'} · {source.count} items
          {source.error && <span className="block text-destructive">{source.error}</span>}
        </li>)}
      </ul>
    </motion.div>
  );
};

export default SourceChart;
