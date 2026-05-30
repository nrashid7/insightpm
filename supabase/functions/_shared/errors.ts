import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return jsonResponse(
      { error: error.message, code: error.code },
      error.statusCode,
    );
  }
  console.error("[edge-function]", error);
  const message = error instanceof Error ? error.message : "Internal server error";
  return jsonResponse({ error: message }, 500);
}

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new AppError("Missing Supabase configuration", 500, "CONFIG_ERROR");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function parseJsonBody<T>(req: Request): Promise<T> {
  try {
    return await req.json() as T;
  } catch {
    throw new AppError("Invalid JSON body", 400, "INVALID_JSON");
  }
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new AppError(`Missing environment variable: ${name}`, 500, "CONFIG_ERROR");
  }
  return value;
}
