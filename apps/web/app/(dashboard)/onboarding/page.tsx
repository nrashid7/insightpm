import { redirect } from "next/navigation";
import { getBusiness } from "@/lib/actions/business";

const ONBOARDING_STEPS: Record<number, string> = {
  1: "/onboarding/business",
  2: "/onboarding/knowledge",
  3: "/onboarding/calendar",
  4: "/onboarding/call-preferences",
  5: "/onboarding/voice",
};

export default async function OnboardingIndexPage() {
  const business = await getBusiness();

  if (!business) {
    redirect("/onboarding/business");
  }

  if (business.onboarding_complete) {
    redirect("/dashboard");
  }

  redirect(ONBOARDING_STEPS[business.onboarding_step] ?? "/onboarding/business");
}
