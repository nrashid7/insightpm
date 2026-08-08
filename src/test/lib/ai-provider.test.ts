import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  ANALYZE_MODEL,
  CLASSIFY_MODEL,
  aiProviderErrorResponse,
  openRouterChatCompletion,
  requireOpenRouterApiKey,
} from "../../../supabase/functions/_shared/ai";

let denoEnv: Record<string, string>;

beforeEach(() => {
  denoEnv = {
    OPENROUTER_API_KEY: "test-openrouter-key",
    SITE_URL: "https://sigyn-kohl.vercel.app",
  };
  (globalThis as any).Deno = { env: { get: (key: string) => denoEnv[key] } };
});

afterEach(() => {
  delete (globalThis as any).Deno;
  vi.restoreAllMocks();
});

describe("requireOpenRouterApiKey", () => {
  it("returns the configured key", () => {
    expect(requireOpenRouterApiKey()).toBe("test-openrouter-key");
  });

  it("throws when the key is missing", () => {
    delete denoEnv.OPENROUTER_API_KEY;
    expect(() => requireOpenRouterApiKey()).toThrow(/OPENROUTER_API_KEY/);
  });
});

describe("openRouterChatCompletion", () => {
  it("posts to OpenRouter with auth and attribution headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await openRouterChatCompletion({ model: ANALYZE_MODEL, messages: [] });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer test-openrouter-key");
    expect(init.headers["HTTP-Referer"]).toBe("https://sigyn-kohl.vercel.app");
    expect(init.headers["X-Title"]).toBe("InsightPM");
    expect(JSON.parse(init.body).model).toBe(ANALYZE_MODEL);
  });

  it("defaults HTTP-Referer to sigyn-kohl when SITE_URL is unset", async () => {
    delete denoEnv.SITE_URL;
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await openRouterChatCompletion({ model: CLASSIFY_MODEL, messages: [] });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["HTTP-Referer"]).toBe("https://sigyn-kohl.vercel.app");
  });
});

describe("aiProviderErrorResponse", () => {
  it("maps rate limit and billing statuses", async () => {
    const rate = aiProviderErrorResponse(429, {});
    expect(rate?.status).toBe(429);

    const billing = aiProviderErrorResponse(402, {});
    expect(billing?.status).toBe(402);
    expect(await billing?.json()).toMatchObject({
      error: expect.stringContaining("OpenRouter"),
    });

    expect(aiProviderErrorResponse(500, {})).toBeNull();
  });
});

describe("model constants", () => {
  it("keeps the previous Gemini model IDs", () => {
    expect(ANALYZE_MODEL).toBe("google/gemini-3-flash-preview");
    expect(CLASSIFY_MODEL).toBe("google/gemini-2.5-flash-lite");
  });
});
