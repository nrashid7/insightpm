import Link from "next/link";
import { Phone, Clock, Calendar, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { CallList } from "@/components/dashboard/call-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCallStats, getCalls } from "@/lib/actions/calls";
import { getBusiness } from "@/lib/actions/business";
import { getUsageStats } from "@/lib/actions/billing";
import { formatDuration } from "@/lib/utils";

export default async function DashboardPage() {
  const [stats, calls, business, usage] = await Promise.all([
    getCallStats(),
    getCalls(5),
    getBusiness(),
    getUsageStats(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {business ? `Welcome, ${business.name}` : "Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Your AI employees are working around the clock.
          </p>
        </div>
        {!business?.onboarding_complete && (
          <Button variant="gradient" asChild>
            <Link href="/onboarding/business">Complete Setup</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Calls"
          value={stats.totalCalls}
          icon={Phone}
          change="+12% this week"
          changeType="positive"
        />
        <StatCard
          title="Answer Rate"
          value={`${stats.answeredRate}%`}
          icon={TrendingUp}
          changeType="positive"
        />
        <StatCard
          title="Avg Duration"
          value={formatDuration(stats.avgDuration)}
          icon={Clock}
        />
        <StatCard
          title="Bookings"
          value={stats.bookings}
          icon={Calendar}
          change="+3 today"
          changeType="positive"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Calls</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/calls">View all</Link>
            </Button>
          </div>
          <CallList calls={calls} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Minutes used</span>
                  <span>{usage.used} / {usage.included}</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all"
                    style={{ width: `${usage.percent}%` }}
                  />
                </div>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/billing">Manage Billing</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
