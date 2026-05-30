import { Building2, Bot, Phone, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminStats, getAdminRecentCalls } from "@/lib/actions/admin";
import { AdminIntegrationsPanel } from "@/components/admin/integrations-panel";
import { Badge } from "@/components/ui/badge";

export default async function AdminPage() {
  const [stats, recentCalls] = await Promise.all([
    getAdminStats(),
    getAdminRecentCalls(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground mt-1">Platform-wide metrics and management.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Businesses" value={String(stats.totalBusinesses)} icon={Building2} />
        <StatCard title="Active Agents" value={String(stats.activeAgents)} icon={Bot} />
        <StatCard title="Calls Today" value={String(stats.callsToday)} icon={Phone} />
        <StatCard title="Total Users" value={String(stats.totalUsers)} icon={Users} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCalls.length === 0 ? (
            <p className="text-muted-foreground text-sm">No calls yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentCalls.map((call) => (
                <li key={call.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">
                      {(call.businesses as { name?: string })?.name ?? "Unknown"}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {call.caller_number ?? "Unknown caller"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{call.status}</Badge>
                    <span className="text-muted-foreground">
                      {Math.round((call.duration_seconds ?? 0) / 60)}m
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AdminIntegrationsPanel />
    </div>
  );
}
