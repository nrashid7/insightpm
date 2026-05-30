import { getCalls } from "@/lib/actions/calls";
import { CallList } from "@/components/dashboard/call-list";

export default async function CallsPage() {
  const calls = await getCalls();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calls</h1>
        <p className="text-muted-foreground mt-1">
          View and analyze all calls handled by your AI employees.
        </p>
      </div>
      <CallList calls={calls} />
    </div>
  );
}
