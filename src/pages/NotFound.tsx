import { ArrowLeft, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
    <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
    <div className="relative max-w-lg text-center">
      <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
        <Zap className="h-7 w-7 text-primary" />
      </div>
      <p className="mb-3 font-mono text-sm uppercase tracking-[0.3em] text-primary">404</p>
      <h1 className="mb-4 text-4xl font-bold text-foreground">Page not found</h1>
      <p className="mb-8 text-muted-foreground">
        The page you requested does not exist or may have moved.
      </p>
      <Button asChild variant="hero" size="lg">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          Back to InsightPM
        </Link>
      </Button>
    </div>
  </main>
);

export default NotFound;
