import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, LogOut, Mail, User } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { openBillingPortal } from "@/lib/api/billing";
import { useToast } from "@/hooks/use-toast";
import { RequireAuth } from "@/components/RequireAuth";

const SettingsContent = () => {
  const { user, signOut } = useAuth();
  const { plan, isActive, analysesUsed, limits } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 pt-24 pb-16 max-w-lg">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-2">Account settings</h1>
          <p className="text-muted-foreground text-sm mb-8">Manage your profile and subscription.</p>

          <div className="space-y-6">
            <div className="rounded-xl border border-border p-5 space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" /> Email
                </Label>
                <Input value={user?.email ?? ""} readOnly className="bg-secondary" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" /> Display name
                </Label>
                <Input
                  value={(user?.user_metadata?.full_name as string) ?? ""}
                  readOnly
                  className="bg-secondary"
                  placeholder="Not set"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Subscription</h2>
              {isActive && limits ? (
                <p className="text-sm text-muted-foreground">
                  {limits.label} plan — {analysesUsed} of {limits.analysesPerMonth} analyses used this period.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No active subscription.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {isActive ? (
                  <Button variant="outline" size="sm" onClick={handleBilling} disabled={portalLoading}>
                    <CreditCard className="w-4 h-4 mr-1" />
                    {portalLoading ? "Opening..." : "Manage billing"}
                  </Button>
                ) : (
                  <Link to="/#pricing">
                    <Button variant="hero" size="sm">View plans</Button>
                  </Link>
                )}
              </div>
              {plan && <p className="text-xs text-muted-foreground">Current plan: {plan}</p>}
            </div>

            <div className="rounded-xl border border-border p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Account</h2>
              <p className="text-sm text-muted-foreground">
                To delete your account and data, email{" "}
                <a href="mailto:privacy@insightpm.app" className="text-primary hover:underline">
                  privacy@insightpm.app
                </a>
                .
              </p>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-1" /> Sign out
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

const Settings = () => (
  <RequireAuth>
    <SettingsContent />
  </RequireAuth>
);

export default Settings;
