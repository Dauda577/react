import { createClient, SupabaseClient } from "@supabase/supabase-js";

const serverUrl =
  process.env.VITE_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "";
const serverAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const createServerSupabase = (): SupabaseClient => {
  if (!serverUrl || !serverAnonKey) {
    throw new Error("Missing Supabase env vars for server client");
  }
  return createClient(serverUrl, serverAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};