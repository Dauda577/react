import { supabase } from "@/lib/supabase";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:8787";

export const API_BASE = BASE_URL;

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
      ...(options.headers ?? {}),
    },
  });

  const body: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (body as { error?: string; message?: string } | null) ?? {};
    const message = msg.error ?? msg.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export const apiGet = <T>(path: string) => apiFetch<T>(path);
export const apiPost = <T>(path: string, data?: unknown) =>
  apiFetch<T>(path, { method: "POST", body: JSON.stringify(data ?? {}) });
export const apiPatch = <T>(path: string, data?: unknown) =>
  apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(data ?? {}) });
export const apiDelete = <T>(path: string) => apiFetch<T>(path, { method: "DELETE" });