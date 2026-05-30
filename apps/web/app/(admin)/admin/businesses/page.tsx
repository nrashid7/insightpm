import { getAdminBusinesses } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminBusinessesPage() {
  const businesses = await getAdminBusinesses();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Businesses</h1>
        <p className="text-muted-foreground mt-1">Manage all tenant businesses.</p>
      </div>

      {businesses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No businesses registered yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {businesses.map((biz) => (
            <Card key={biz.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">{biz.name}</CardTitle>
                <Badge variant={biz.onboarding_complete ? "default" : "secondary"}>
                  {biz.onboarding_complete ? "Live" : "Onboarding"}
                </Badge>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Industry: {biz.industry}</p>
                <p>Agents: {(biz.agents as { count: number }[])?.[0]?.count ?? 0}</p>
                <p>Joined: {new Date(biz.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
