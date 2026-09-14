export async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error && typeof error === "object" && "context" in error) {
    const response = error.context;
    if (response instanceof Response) {
      try {
        const body = await response.clone().json();
        if (typeof body?.error === "string") return body.error;
      } catch { /* Non-JSON provider or gateway error. */ }
      if (response.status === 429) return "Too many requests. Please wait a moment before trying again.";
    }
  }
  return error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : fallback;
}
