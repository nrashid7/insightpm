import { getAdminTemplates } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminTemplatesPage() {
  const templates = await getAdminTemplates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agent Templates</h1>
        <p className="text-muted-foreground mt-1">
          Reusable vertical templates stored in the database.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => {
          const config = template.config as {
            display?: { specialty?: string; description?: string };
            system_prompt?: string;
          };
          return (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{template.name}</CardTitle>
                  <Badge variant="outline">{template.industry}</Badge>
                </div>
                <CardDescription>{config.display?.specialty}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {config.display?.description}
                </p>
                <details className="text-xs">
                  <summary className="cursor-pointer text-indigo-400">System prompt preview</summary>
                  <pre className="mt-2 p-3 rounded-lg bg-black/30 overflow-auto max-h-40 whitespace-pre-wrap">
                    {config.system_prompt}
                  </pre>
                </details>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
