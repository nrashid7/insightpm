import { AppError } from "./errors.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const PRIMARY_MODEL = "anthropic/claude-sonnet-4";
const FALLBACK_MODEL = "openai/gpt-4.1-mini";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
}

export async function chatCompletion(
  options: ChatCompletionOptions,
): Promise<ChatCompletionResult> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new AppError("Missing OPENROUTER_API_KEY", 500, "CONFIG_ERROR");
  }

  const models = [PRIMARY_MODEL, FALLBACK_MODEL];

  for (const model of models) {
    try {
      const result = await callOpenRouter(apiKey, model, options);
      if (result.content) {
        return { content: result.content, model };
      }
    } catch (err) {
      console.warn(`[ai] Model ${model} failed:`, err);
      if (model === FALLBACK_MODEL) throw err;
    }
  }

  throw new AppError("All AI models failed", 502, "AI_ERROR");
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  options: ChatCompletionOptions,
): Promise<{ content: string }> {
  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 2048,
  };

  if (options.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": Deno.env.get("APP_URL") ?? "https://businessvoice.ai",
      "X-Title": "BusinessVoice AI",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(
      `OpenRouter error (${model}): ${text}`,
      response.status,
      "AI_ERROR",
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return { content };
}

export async function chatCompletionJson<T>(
  options: ChatCompletionOptions,
): Promise<{ data: T; model: string }> {
  const result = await chatCompletion({ ...options, jsonMode: true });
  try {
    return { data: JSON.parse(result.content) as T, model: result.model };
  } catch {
    throw new AppError("Failed to parse AI JSON response", 502, "AI_PARSE_ERROR");
  }
}
