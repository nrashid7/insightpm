"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { defaultHours } from "@businessvoice/shared";
import { createBusiness } from "@/lib/actions/business";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OnboardingBusinessPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [industry, setIndustry] = useState("general_smb");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("industry", industry);
    formData.set("hours", JSON.stringify(defaultHours));
    formData.set("timezone", "America/New_York");

    const result = await createBusiness(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/onboarding/knowledge");
    }
  }

  return (
    <OnboardingLayout
      currentStep={1}
      title="Tell us about your business"
      description="We'll customize your AI employee to match your business."
    >
      <form action={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <div>
          <Label htmlFor="name">Business Name</Label>
          <Input id="name" name="name" required className="mt-1.5" placeholder="Sunrise Salon" />
        </div>
        <div>
          <Label htmlFor="phone">Business Phone</Label>
          <Input id="phone" name="phone" type="tel" required className="mt-1.5" placeholder="+1 (555) 000-0000" />
        </div>
        <div>
          <Label htmlFor="website">Website (optional)</Label>
          <Input id="website" name="website" type="url" className="mt-1.5" placeholder="https://yoursite.com" />
        </div>
        <div>
          <Label>Industry</Label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general_smb">General SMB</SelectItem>
              <SelectItem value="salon_spa">Salon & Spa</SelectItem>
              <SelectItem value="home_services">Home Services</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </Button>
      </form>
    </OnboardingLayout>
  );
}
