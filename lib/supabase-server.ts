import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | undefined;

function requiredEnvironmentVariable(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`متغير البيئة ${name} غير مضبوط`);
  }
  return value;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const rawUrl = requiredEnvironmentVariable("SUPABASE_URL");
  const serviceRoleKey = requiredEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY");

  let supabaseUrl: string;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") throw new Error("invalid protocol");
    supabaseUrl = parsed.origin;
  } catch {
    throw new Error("SUPABASE_URL غير صالح");
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return adminClient;
}
