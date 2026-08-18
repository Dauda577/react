export type EnvKey = "url" | "anonKey" | "apiUrl";

export function envVar(key: EnvKey): string {
  if (typeof window === "undefined") {
    if (key === "url") return process.env.VITE_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    if (key === "anonKey") return process.env.VITE_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    return process.env.VITE_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
  }
  if (key === "url") return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (key === "anonKey") return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return process.env.NEXT_PUBLIC_API_URL ?? "";
}
