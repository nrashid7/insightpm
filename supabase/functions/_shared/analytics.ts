export interface PostHogCaptureOptions {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
  groups?: Record<string, string>;
}

export async function captureEvent(options: PostHogCaptureOptions): Promise<void> {
  const apiKey = Deno.env.get("POSTHOG_API_KEY");
  const host = Deno.env.get("POSTHOG_HOST") ?? "https://us.i.posthog.com";

  if (!apiKey) {
    console.warn("[analytics] POSTHOG_API_KEY not set, skipping capture");
    return;
  }

  const payload = {
    api_key: apiKey,
    event: options.event,
    distinct_id: options.distinctId,
    properties: {
      ...options.properties,
      $groups: options.groups,
      source: "edge_function",
    },
    timestamp: new Date().toISOString(),
  };

  const response = await fetch(`${host}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.warn("[analytics] PostHog capture failed:", await response.text());
  }
}

export async function captureBusinessEvent(
  businessId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  await captureEvent({
    distinctId: businessId,
    event,
    properties,
    groups: { business: businessId },
  });
}

export async function captureCallEvent(
  businessId: string,
  callId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  await captureEvent({
    distinctId: callId,
    event,
    properties: { business_id: businessId, call_id: callId, ...properties },
    groups: { business: businessId },
  });
}
