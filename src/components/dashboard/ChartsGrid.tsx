import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Tooltip } from "recharts";
import type { AnalysisResult } from "@/lib/types/analysis";

interface ChartsGridProps {
  data: AnalysisResult;
}

const ChartsGrid = ({ data }: ChartsGridProps) => (
  <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
    {/* Complaints */}
    <motion.div className="rounded-xl border border-border bg-card/50 p-4 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
      <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-accent" /> Top Complaints
      </h3>
      <p className="text-xs text-muted-foreground mb-4">By mention count across all sources</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data.complaints} layout="vertical" margin={{ left: 10 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={110} tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Bar dataKey="mentions" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>

    {/* Sentiment */}
    <motion.div className="rounded-xl border border-border bg-card/50 p-4 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
      <h3 className="text-sm font-semibold text-foreground mb-1">Sentiment Breakdown</h3>
      <p className="text-xs text-muted-foreground mb-4">{data.ratingCount !== undefined ? 'Distribution of collected star ratings' : 'Overall sentiment distribution'}</p>
      {data.ratingCount === 0 ? <p className="text-sm text-muted-foreground">No star ratings were collected. Sentiment is unmeasured.</p> : <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie data={data.sentiment} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} strokeWidth={0}>
              {data.sentiment.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-3">
          {data.sentiment.map((s) => (
            <div key={s.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
              <span className="text-sm text-muted-foreground">{s.name}</span>
              <span className="text-sm font-semibold text-foreground ml-auto">{data.ratingCount !== undefined ? `${s.value} ratings` : `${s.value}%`}</span>
            </div>
          ))}
        </div>
      </div>}
    </motion.div>

    {/* Trend */}
    <motion.div className="rounded-xl border border-border bg-card/50 p-4 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
      <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-chart-4" /> Dated Feedback
      </h3>
      <p className="text-xs text-muted-foreground mb-4">Collected items by publication month; sampling is not a market-wide trend.</p>
      {!data.trendData.length && <p className="text-sm text-muted-foreground">No publication dates available.</p>}
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data.trendData}>
          <XAxis dataKey="month" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip contentStyle={{ background: "hsl(222, 44%, 8%)", border: "1px solid hsl(222, 20%, 16%)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "hsl(210, 40%, 96%)" }} />
          <Line type="monotone" dataKey="requests" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>

    {/* Competitors */}
    <motion.div className="rounded-xl border border-border bg-card/50 p-4 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
      <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
        <Users className="w-4 h-4 text-chart-5" /> Competitor Intel
      </h3>
      <p className="text-xs text-muted-foreground mb-4">Key competitor weaknesses</p>
      <div className="space-y-3">
        {data.competitors.length > 0 ? (
          data.competitors.map((c) => (
            <div key={c.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <div className="text-sm font-medium text-foreground">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.weakness}</div>
              </div>
              <div className="text-sm font-mono text-accent">{c.sentiment}/5</div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No competitors analyzed.</p>
        )}
      </div>
    </motion.div>
  </div>
);

export default ChartsGrid;
