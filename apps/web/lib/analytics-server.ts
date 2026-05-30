"use server";

export async function trackServerEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  const apiKey = process.env.POSTHOG_API_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  if (!apiKey) return;

  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        properties: { ...properties, source: "server" },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // non-blocking
  }
}
