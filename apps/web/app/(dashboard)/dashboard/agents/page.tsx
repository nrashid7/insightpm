import { agentTemplates } from "@businessvoice/shared";
import { getAgents } from "@/lib/actions/agents";
import { DashboardAgentCard } from "@/components/agents/agent-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";

export default async function AgentsPage() {
  const agents = await getAgents();
  const availableTemplates = agentTemplates.filter(
    (t) => !agents.some((a) => a.name.toLowerCase() === t.agent_name.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">AI Employees</h1>
        <p className="text-muted-foreground mt-1">
          Manage your hired AI employees and preview their voices.
        </p>
      </div>

      {agents.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <DashboardAgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold">No AI employees yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Complete onboarding to hire your first AI employee.
            </p>
          </CardContent>
        </Card>
      )}

      {availableTemplates.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Available to Hire</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableTemplates.map((t) => (
              <Card key={t.agent_name} className="opacity-75">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{t.agent_name}</h3>
                    <Badge variant="outline">{t.display.specialty}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{t.display.tagline}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
