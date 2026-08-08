export function verifyInternalSecret(req: Request): void {
  const secret = req.headers.get("x-internal-secret");
  const expected = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  if (!secret || !expected || secret !== expected) {
    throw new Error("Unauthorized: invalid internal secret");
  }
}

export function verifyServiceRole(req: Request): void {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !expected || token !== expected) {
    throw new Error("Unauthorized: service role required");
  }
}

export function isServiceRoleRequest(req: Request): boolean {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return !!token && !!expected && token === expected;
}

export function isInternalMonitoringRequest(req: Request): boolean {
  if (!isServiceRoleRequest(req)) return false;
  const secret = req.headers.get("x-internal-secret");
  const expected = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  return !!secret && !!expected && secret === expected;
}
