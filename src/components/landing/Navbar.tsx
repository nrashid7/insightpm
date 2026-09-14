import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Menu, LogOut, History, Bell, CreditCard, Settings } from "lucide-react";
import { openBillingPortal } from "@/lib/api/billing";
import { BILLING_ENABLED } from "@/lib/product-config";
import { useSubscription } from "@/hooks/useSubscription";
import { PLAN_LIMITS } from "@/lib/plans";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

const Navbar = () => {
  const { user, loading, signOut } = useAuth();
  const { isActive, plan } = useSubscription();
  const canMonitor = isActive && !!plan && PLAN_LIMITS[plan].maxMonitoredProducts > 0;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleBilling = async () => {
    setPortalLoading(true);
    try {
      const url = await openBillingPortal();
      window.location.href = url;
    } catch (e) {
      toast({
        title: "Billing portal unavailable",
        description: e instanceof Error ? e.message : "Try again later",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "U";

  useEffect(() => {
    if (!user) { setUnreadAlerts(0); return; }
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("monitoring_alerts")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      setUnreadAlerts(count || 0);
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground">InsightPM</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {!loading && user ? (
            <>
              <Link to="/history">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <History className="w-4 h-4 mr-1" /> History
                </Button>
              </Link>
              {canMonitor && (
                <Link to="/monitor">
                  <Button variant="ghost" size="sm" className="text-muted-foreground relative">
                    <Bell className="w-4 h-4 mr-1" /> Monitor
                    {unreadAlerts > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                        {unreadAlerts > 9 ? "9+" : unreadAlerts}
                      </span>
                    )}
                  </Button>
                </Link>
              )}
              {isActive ? (
                <Link to="/analyze">
                  <Button variant="hero" size="sm">New Analysis</Button>
                </Link>
              ) : (
                <a href="#pricing">
                  <Button variant="hero" size="sm">Subscribe</Button>
                </a>
              )}
              {BILLING_ENABLED && isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  disabled={portalLoading}
                  onClick={handleBilling}
                >
                  <CreditCard className="w-4 h-4 mr-1" /> Billing
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
                <LogOut className="w-4 h-4 mr-1" /> Sign Out
              </Button>
              <Link to="/settings">
                <Button variant="ghost" size="icon" className="text-muted-foreground" title="Settings">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs bg-primary/20 text-primary">{initials}</AvatarFallback>
              </Avatar>
            </>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost" size="sm" className="text-muted-foreground">Sign in</Button></Link>
              <a href="#pricing">
                <Button variant="hero" size="sm">Get Started</Button>
              </a>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-card border-border w-72">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex flex-col gap-4 mt-8">
                <a href="#features" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2">Features</a>
                <a href="#how-it-works" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2">How it works</a>
                <a href="#pricing" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2">Pricing</a>
                <div className="border-t border-border pt-4 mt-2 space-y-3">
                  {!loading && user ? (
                    <>
                      <Link to="/history" onClick={() => setOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                          <History className="w-4 h-4 mr-2" /> History
                        </Button>
                      </Link>
                      {canMonitor && (
                        <Link to="/monitor" onClick={() => setOpen(false)}>
                          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground relative">
                            <Bell className="w-4 h-4 mr-2" /> Monitor
                            {unreadAlerts > 0 && (
                              <span className="ml-auto w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                                {unreadAlerts > 9 ? "9+" : unreadAlerts}
                              </span>
                            )}
                          </Button>
                        </Link>
                      )}
                      <Link to="/settings" onClick={() => setOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                          <Settings className="w-4 h-4 mr-2" /> Settings
                        </Button>
                      </Link>
                      {isActive ? (
                        <Link to="/analyze" onClick={() => setOpen(false)}>
                          <Button variant="hero" size="sm" className="w-full">New Analysis</Button>
                        </Link>
                      ) : (
                        <a href="#pricing" onClick={() => setOpen(false)}>
                          <Button variant="hero" size="sm" className="w-full">Subscribe</Button>
                        </a>
                      )}
                      {BILLING_ENABLED && isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-muted-foreground"
                          disabled={portalLoading}
                          onClick={() => { handleBilling(); setOpen(false); }}
                        >
                          <CreditCard className="w-4 h-4 mr-2" /> Billing
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => { signOut(); setOpen(false); }} className="w-full justify-start text-muted-foreground">
                        <LogOut className="w-4 h-4 mr-2" /> Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/auth" onClick={() => setOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">Sign in</Button>
                      </Link>
                      <a href="#pricing" onClick={() => setOpen(false)}>
                        <Button variant="hero" size="sm" className="w-full">Get Started</Button>
                      </a>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
