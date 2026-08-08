export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Compares a caller-supplied credential against the expected one without
 * leaking how many leading characters matched.
 */
function secretsMatch(actual: string | null, expected: string | undefined): boolean {
  if (!actual || !expected) return false;

  let diff = actual.length ^ expected.length;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ actual.charCodeAt(i % actual.length);
  }
  return diff === 0;
}

function bearerToken(req: Request): string {
  return (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
}

export function verifyInternalSecret(req: Request): void {
  if (!secretsMatch(req.headers.get("x-internal-secret"), Deno.env.get("INTERNAL_FUNCTION_SECRET"))) {
    throw new UnauthorizedError("Unauthorized: invalid internal secret");
  }
}

export function verifyServiceRole(req: Request): void {
  if (!secretsMatch(bearerToken(req), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))) {
    throw new UnauthorizedError("Unauthorized: service role required");
  }
}

export function isServiceRoleRequest(req: Request): boolean {
  return secretsMatch(bearerToken(req), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
}

export function isInternalMonitoringRequest(req: Request): boolean {
  if (!isServiceRoleRequest(req)) return false;
  return secretsMatch(req.headers.get("x-internal-secret"), Deno.env.get("INTERNAL_FUNCTION_SECRET"));
}
