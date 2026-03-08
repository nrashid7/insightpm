import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Search, ArrowLeft, TrendingDown, TrendingUp, MessageSquare, Users, Star, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Tooltip } from "recharts";

const complaintData = [
  { name: "Slow loading", mentions: 1340 },
  { name: "Missing features", mentions: 900 },
  { name: "Bad mobile UX", mentions: 430 },
  { name: "Pricing", mentions: 380 },
  { name: "Sync issues", mentions: 290 },
];

const sentimentData = [
  { name: "Positive", value: 42, color: "hsl(150, 60%, 50%)" },
  { name: "Neutral", value: 28, color: "hsl(215, 20%, 55%)" },
  { name: "Negative", value: 30, color: "hsl(0, 72%, 55%)" },
];

const trendData = [
  { month: "Jan", requests: 120 },
  { month: "Feb", requests: 180 },
  { month: "Mar", requests: 240 },
  { month: "Apr", requests: 310 },
  { month: "May", requests: 420 },
  { month: "Jun", requests: 580 },
];

const featureRequests = [
  { name: "Offline Mode", mentions: 2400, trend: "up" },
  { name: "Dark Mode", mentions: 1800, trend: "up" },
  { name: "API Access", mentions: 1200, trend: "up" },
  { name: "Mobile App", mentions: 950, trend: "stable" },
];

const competitors = [
  { name: "Competitor A", weakness: "Poor mobile UX", sentiment: 3.2 },
  { name: "Competitor B", weakness: "Missing API", sentiment: 3.8 },
  { name: "Competitor C", weakness: "High pricing", sentiment: 2.9 },
];

const Dashboard = () => {
  const [productName, setProductName] = useState("Notion");
  const [showResults, setShowResults] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border h-14 flex items-center px-6 glass sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2 mr-6">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-bold text-foreground">InsightPM</span>
        </Link>

        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Enter product name..."
              className="pl-10 bg-secondary border-border h-9"
            />
          </div>
        </div>

        <div className="ml-auto">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
        </div>
      </header>

      {showResults && (
        <main className="container mx-auto px-6 py-8">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Analysis: <span className="text-gradient-primary">{productName}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              4,340 feedback items analyzed from 6 sources
            </p>
          </motion.div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: MessageSquare, label: "Total Feedback", value: "4,340", color: "text-primary" },
              { icon: Star, label: "Avg Sentiment", value: "3.4/5", color: "text-accent" },
              { icon: TrendingDown, label: "Top Complaints", value: "1,340", color: "text-destructive" },
              { icon: TrendingUp, label: "Feature Requests", value: "2,400", color: "text-chart-4" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                className="rounded-xl border border-border bg-card/50 p-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Charts grid */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Complaints chart */}
            <motion.div
              className="rounded-xl border border-border bg-card/50 p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-accent" />
                Top Complaints
              </h3>
              <p className="text-xs text-muted-foreground mb-4">By mention count across all sources</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={complaintData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Bar dataKey="mentions" fill="hsl(187, 85%, 53%)" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Sentiment pie */}
            <motion.div
              className="rounded-xl border border-border bg-card/50 p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-sm font-semibold text-foreground mb-1">Sentiment Breakdown</h3>
              <p className="text-xs text-muted-foreground mb-4">Overall sentiment distribution</p>
              <div className="flex items-center gap-8">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={sentimentData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} strokeWidth={0}>
                      {sentimentData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {sentimentData.map((s) => (
                    <div key={s.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                      <span className="text-sm text-muted-foreground">{s.name}</span>
                      <span className="text-sm font-semibold text-foreground ml-auto">{s.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Feature requests trend */}
            <motion.div
              className="rounded-xl border border-border bg-card/50 p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-chart-4" />
                Feature Request Trend
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Monthly request volume</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trendData}>
                  <XAxis dataKey="month" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "hsl(222, 44%, 8%)", border: "1px solid hsl(222, 20%, 16%)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "hsl(210, 40%, 96%)" }}
                  />
                  <Line type="monotone" dataKey="requests" stroke="hsl(187, 85%, 53%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Competitor table */}
            <motion.div
              className="rounded-xl border border-border bg-card/50 p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <Users className="w-4 h-4 text-chart-5" />
                Competitor Intel
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Key competitor weaknesses</p>
              <div className="space-y-3">
                {competitors.map((c) => (
                  <div key={c.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <div className="text-sm font-medium text-foreground">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.weakness}</div>
                    </div>
                    <div className="text-sm font-mono text-accent">{c.sentiment}/5</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* AI Recommendation */}
          <motion.div
            className="rounded-xl border border-primary/20 bg-primary/5 p-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">AI Recommendation</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Based on <strong className="text-foreground">2,400 mentions</strong> across Reddit, App Store, and Google Reviews, 
                  the top feature request is <strong className="text-primary">Offline Mode</strong>. Users consistently express 
                  frustration with the lack of offline access, especially on mobile. Building this feature would address 
                  <strong className="text-foreground">55%</strong> of negative feedback and differentiate from Competitor A and C.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Top Feature Requests */}
          <motion.div
            className="mt-6 rounded-xl border border-border bg-card/50 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
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
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(f.mentions / 2400) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </main>
      )}
    </div>
  );
};

export default Dashboard;
