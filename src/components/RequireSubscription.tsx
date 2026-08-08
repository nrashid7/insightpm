import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

interface RequireSubscriptionProps {
  children: React.ReactNode;
}

export function RequireSubscription({ children }: RequireSubscriptionProps) {
  const { isActive, loading, plan, analysesUsed, limits } = useSubscription();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isActive || !plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 pt-16">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Subscription required</h1>
          <p className="text-muted-foreground">
            Choose a plan to run product analyses, save history, and use monitoring.
          </p>
          <Link to="/#pricing">
            <Button variant="hero" size="lg">View plans</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (limits && analysesUsed >= limits.analysesPerMonth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 pt-16">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Monthly limit reached</h1>
          <p className="text-muted-foreground">
            You have used {analysesUsed} of {limits.analysesPerMonth} analyses on your {limits.label} plan.
          </p>
          <Link to="/#pricing">
            <Button variant="hero" size="lg">Upgrade plan</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
