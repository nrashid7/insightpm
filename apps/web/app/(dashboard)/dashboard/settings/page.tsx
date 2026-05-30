import { Calendar, Database, Sheet, Globe, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getIntegrations } from "@/lib/actions/integrations";

const integrationDefs = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Sync availability and book appointments in real-time.",
    icon: Calendar,
    connectUrl: "/api/oauth/google?state=settings",
  },
  {
    id: "calendly",
    name: "Calendly",
    description: "Connect Calendly for appointment scheduling.",
    icon: Globe,
    connectUrl: "/api/integrations/connect?provider=calendly",
  },
  {
    id: "cal_com",
    name: "Cal.com",
    description: "Connect Cal.com with your API key.",
    icon: Globe,
    connectUrl: "/api/integrations/connect?provider=cal_com",
  },
  {
    id: "hubspot",
    name: "HubSpot CRM",
    description: "Push qualified leads and call summaries to HubSpot.",
    icon: Database,
    connectUrl: "/api/integrations/connect?provider=hubspot",
  },
  {
    id: "gohighlevel",
    name: "GoHighLevel",
    description: "Sync leads to your GHL pipeline automatically.",
    icon: Zap,
    connectUrl: "/api/integrations/connect?provider=gohighlevel",
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    description: "Log call data and leads to a spreadsheet.",
    icon: Sheet,
    connectUrl: "/api/integrations/connect?provider=google_sheets",
  },
];

export default async function SettingsPage() {
  const connected = await getIntegrations();
  const connectedIds = new Set(connected.filter((i) => i.is_active).map((i) => i.provider));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect your tools to supercharge your AI employees.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrationDefs.map((integration) => {
          const isConnected = connectedIds.has(integration.id);
          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
                    <integration.icon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <Badge variant={isConnected ? "default" : "outline"}>
                    {isConnected ? "Connected" : "Not connected"}
                  </Badge>
                </div>
                <CardTitle className="mt-4">{integration.name}</CardTitle>
                <CardDescription>{integration.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild disabled={isConnected}>
                  <a href={isConnected ? "#" : integration.connectUrl}>
                    {isConnected ? "Connected" : "Connect"}
                  </a>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
