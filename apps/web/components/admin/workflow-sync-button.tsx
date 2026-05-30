"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkflowSyncButtonProps {
  serverAction?: () => Promise<{ error?: string; synced?: number; total?: number }>;
}

export function WorkflowSyncButton({ serverAction }: WorkflowSyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setMessage(null);

    try {
      if (serverAction) {
        const result = await serverAction();
        if (result.error) {
          setMessage(result.error);
        } else {
          setMessage(`Synced ${result.synced}/${result.total} workflows`);
        }
      } else {
        const res = await fetch("/api/admin/sync-n8n", { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error ?? "Sync failed");
        } else {
          setMessage(`Synced ${data.synced}/${data.total} workflows to Supabase`);
        }
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sync failed");
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={handleSync} disabled={loading}>
        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
        Sync Workflows
      </Button>
      {message && <span className="text-xs text-muted-foreground max-w-xs text-right">{message}</span>}
    </div>
  );
}
