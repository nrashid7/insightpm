import { useCallback, useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createCheckoutSession } from "@/lib/api/billing";
import type { PlanId } from "@/lib/plans";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

type AuthView = "login" | "signup" | "forgot-password" | "reset-password";

const Auth = () => {
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pendingPlan = searchParams.get("plan") as PlanId | null;
  const { toast } = useToast();
  const redirectStartedRef = useRef(false);
  const recoveryModeRef = useRef(false);

  const afterAuthRedirect = useCallback(async () => {
    if (recoveryModeRef.current || redirectStartedRef.current) return;
    redirectStartedRef.current = true;

    if (pendingPlan && ["starter", "growth", "enterprise"].includes(pendingPlan)) {
      try {
        const url = await createCheckoutSession(pendingPlan);
        window.location.href = url;
        return;
      } catch {
        toast({ title: "Checkout unavailable", description: "Choose a plan from the pricing section.", variant: "destructive" });
      }
    }
    navigate("/analyze");
  }, [navigate, pendingPlan, toast]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryModeRef.current = true;
        setView("reset-password");
        return;
      }
      if (event === "SIGNED_IN" && session) {
        afterAuthRedirect();
      }
    });

    return () => subscription.unsubscribe();
  }, [afterAuthRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (view === "reset-password") {
        if (newPassword.length < 6) {
          toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        toast({ title: "Password updated", description: "Your password has been reset successfully." });
        setView("login");
        setNewPassword("");
      } else if (view === "forgot-password") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast({
          title: "Reset link sent",
          description: "Check your email for a password reset link.",
        });
        setView("login");
      } else if (view === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!" });
        trackEvent("login", { method: "email" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "We sent you a verification link to confirm your account.",
        });
        trackEvent("signup", { method: "email" });
      }
    } catch (error: any) {
      toast({
        title: view === "forgot-password" ? "Reset failed" : view === "login" ? "Login failed" : "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    trackEvent("oauth_attempt", { provider });
    const redirectTo = pendingPlan && ["starter", "growth", "enterprise"].includes(pendingPlan)
      ? `${window.location.origin}/auth?plan=${pendingPlan}`
      : `${window.location.origin}/auth`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      toast({ title: "OAuth failed", description: error.message, variant: "destructive" });
    }
  };

  const headings: Record<AuthView, { title: string; description: string }> = {
    login: { title: "Welcome back", description: "Log in to access your saved analyses." },
    signup: { title: "Get started", description: "Create an account to save and revisit your product insights." },
    "forgot-password": { title: "Reset password", description: "Enter your email and we'll send you a reset link." },
    "reset-password": { title: "Set new password", description: "Enter your new password below." },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center pt-16 px-6">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-foreground mb-3">
              {headings[view].title}
            </h1>
            <p className="text-muted-foreground">{headings[view].description}</p>
          </div>

          {view !== "forgot-password" && view !== "reset-password" && (
            <>
              <div className="flex gap-3 mb-6">
                <Button
                  variant="outline"
                  className="flex-1 h-11"
                  onClick={() => handleOAuth("google")}
                  type="button"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-11"
                  onClick={() => handleOAuth("github")}
                  type="button"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                  GitHub
                </Button>
              </div>

              <div className="relative mb-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
                  or continue with email
                </span>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {view === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2 text-foreground">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="bg-secondary border-border h-11"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-foreground">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="bg-secondary border-border h-11"
                required
              />
            </div>

            {view === "reset-password" && (
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="flex items-center gap-2 text-foreground">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-secondary border-border h-11"
                  required
                  minLength={6}
                />
              </div>
            )}

            {view !== "forgot-password" && view !== "reset-password" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="flex items-center gap-2 text-foreground">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Password
                  </Label>
                  {view === "login" && (
                    <button
                      type="button"
                      onClick={() => setView("forgot-password")}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-secondary border-border h-11"
                  required
                  minLength={6}
                />
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full h-12 text-base" disabled={isLoading}>
              {isLoading
                ? "Please wait..."
                : view === "reset-password"
                  ? "Update Password"
                  : view === "forgot-password"
                    ? "Send Reset Link"
                    : view === "login"
                      ? "Log In"
                      : "Create Account"}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            {view === "reset-password" ? (
              <button onClick={() => setView("login")} className="text-primary hover:underline font-medium">
                Back to login
              </button>
            ) : view === "forgot-password" ? (
              <button onClick={() => setView("login")} className="text-primary hover:underline font-medium">
                Back to login
              </button>
            ) : view === "login" ? (
              <>
                Don't have an account?{" "}
                <button onClick={() => setView("signup")} className="text-primary hover:underline font-medium">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => setView("login")} className="text-primary hover:underline font-medium">
                  Log in
                </button>
              </>
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
