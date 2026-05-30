"use client";

import posthog from "posthog-js";

export function trackEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture(event, properties);
  }
}

export const AnalyticsEvents = {
  SIGNUP: "signup",
  ONBOARDING_STEP: "onboarding_step_completed",
  AGENT_HIRED: "agent_hired",
  FIRST_CALL: "first_call_received",
  APPOINTMENT_BOOKED: "appointment_booked",
  VOICE_PREVIEW: "voice_preview_played",
  DEMO_CALL: "demo_call_started",
} as const;
