export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 2, baseDelayMs = 500, maxDelayMs = 3000 } = opts;

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}
