import type { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase.js";

export type AuthedUser = { id: string; email?: string; role: string };

export type AuthedRequest = Request & {
  user: AuthedUser;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

export {};

// Verifies the user's GoTrue JWT against Supabase (same as the old edge
// functions did) and attaches the identity to req.user.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  const token = header.slice(7);
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.user = {
      id: data.user.id,
      email: data.user.email ?? undefined,
      role: data.user.role ?? "authenticated",
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Admin guard: the user must be a verified official in profiles.
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const { id } = req.user!;
  const { data, error } = await supabase
    .from("profiles")
    .select("is_official")
    .eq("id", id)
    .maybeSingle();
  if (error || !data?.is_official) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}