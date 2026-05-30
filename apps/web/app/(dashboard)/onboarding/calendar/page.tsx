"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { completeOnboardingCalendar } from "@/lib/actions/onboarding";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function OnboardingCalendarPage() {
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setLoading(true);
    await completeOnboardingCalendar();
  }

  return (
    <OnboardingLayout
      currentStep={3}
      title="Connect your calendar"
      description="Enable your AI employee to check availability and book appointments."
    >
      <div className="space-y-6">
        <Card className="cursor-pointer hover:bg-white/5 transition-colors">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20">
              <Calendar className="h-6 w-6 text-indigo-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Google Calendar</h3>
              <p className="text-sm text-muted-foreground">
                Sync availability and book appointments automatically
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href="/api/oauth/google">Connect</a>
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleContinue} disabled={loading}>
            Skip for now
          </Button>
          <Button variant="gradient" className="flex-1" onClick={handleContinue} disabled={loading}>
            {loading ? "Saving..." : "Continue"}
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
