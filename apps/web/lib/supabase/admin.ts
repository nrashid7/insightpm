export function getSupabaseServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for this server-side operation");
  }
  return key;
}
