import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getWorkflowStatus } from "@/lib/actions/n8n";
import { WorkflowSyncButton } from "@/components/admin/workflow-sync-button";

export async function AdminIntegrationsPanel() {
  const workflows = await getWorkflowStatus();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>n8n Automation</CardTitle>
          <CardDescription>
            Workflows registered in Supabase. Sync from your n8n webhook URLs after connecting MCP.
          </CardDescription>
        </div>
        <WorkflowSyncButton />
      </CardHeader>
      <CardContent>
        {workflows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No workflows synced yet. Set <code className="text-xs">N8N_WEBHOOK_BASE_URL</code> in
            Supabase secrets and click Sync Workflows.
          </p>
        ) : (
          <ul className="space-y-3">
            {workflows.map((wf) => (
              <li
                key={wf.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{wf.name}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-md">
                    {wf.webhook_url ?? "No webhook URL"}
                  </p>
                </div>
                <Badge variant={wf.is_active && wf.webhook_url ? "default" : "secondary"}>
                  {wf.is_active && wf.webhook_url ? "Active" : "Inactive"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
