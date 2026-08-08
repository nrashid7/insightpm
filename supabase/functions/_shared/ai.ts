/** OpenRouter chat-completions client (OpenAI-compatible). */

export const ANALYZE_MODEL = "google/gemini-3-flash-preview";
export const CLASSIFY_MODEL = "google/gemini-2.5-flash-lite";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export function requireOpenRouterApiKey(): string {
  const key = Deno.env.get("OPENROUTER_API_KEY")?.trim();
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
  return key;
}

export type ChatCompletionBody = Record<string, unknown>;

/**
 * POST to OpenRouter's OpenAI-compatible chat completions endpoint.
 * Caller owns retry / status handling.
 */
export async function openRouterChatCompletion(
  body: ChatCompletionBody,
  apiKey = requireOpenRouterApiKey(),
): Promise<Response> {
  const siteUrl = Deno.env.get("SITE_URL")?.trim() || "https://sigyn-kohl.vercel.app";

  return fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": siteUrl,
      "X-Title": "InsightPM",
    },
    body: JSON.stringify(body),
  });
}

/** Map provider HTTP status to a user-facing Response, or null if not special-cased. */
export function aiProviderErrorResponse(
  status: number,
  corsHeaders: Record<string, string>,
): Response | null {
  if (status === 429) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (status === 402) {
    return new Response(
      JSON.stringify({ error: "AI usage limit reached. Please add OpenRouter credits." }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  return null;
}
