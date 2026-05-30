"use client";

import { useState } from "react";
import { saveCallPreferences } from "@/lib/actions/onboarding";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingCallPreferencesPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("voicemail_enabled", "true");
    const result = await saveCallPreferences(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <OnboardingLayout
      currentStep={4}
      title="Call preferences"
      description="Configure how your AI employee handles calls and escalations."
    >
      <form action={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <div>
          <Label htmlFor="transfer_number">Transfer Number</Label>
          <Input
            id="transfer_number"
            name="transfer_number"
            type="tel"
            className="mt-1.5"
            placeholder="+1 (555) 000-0000"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Calls requiring a human will transfer here
          </p>
        </div>
        <div>
          <Label htmlFor="emergency_number">Emergency Number</Label>
          <Input
            id="emergency_number"
            name="emergency_number"
            type="tel"
            className="mt-1.5"
            placeholder="+1 (555) 000-0000"
          />
        </div>
        <div>
          <Label htmlFor="after_hours_message">After Hours Message</Label>
          <Input
            id="after_hours_message"
            name="after_hours_message"
            className="mt-1.5"
            placeholder="Thanks for calling! We're currently closed..."
          />
        </div>
        <div>
          <Label htmlFor="voicemail_message">Voicemail Message</Label>
          <Input
            id="voicemail_message"
            name="voicemail_message"
            className="mt-1.5"
            placeholder="Please leave a message and we'll call you back."
          />
        </div>
        <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </Button>
      </form>
    </OnboardingLayout>
  );
}
