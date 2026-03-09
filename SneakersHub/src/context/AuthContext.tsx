// src/context/AuthContext.tsx - Fix the loading logic

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase, Profile } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";

type User = {
  id: string;
  name: string;
  email: string;
  role: "buyer" | "seller";
};

type AuthContextType = {
  user: User | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  needsRole: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: "buyer" | "seller") => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  assignRole: (role: "buyer" | "seller") => Promise<void>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem("sneakershub-user");
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });

  const setUser = (u: User | null) => {
    setUserState(u);
    if (u) localStorage.setItem("sneakershub-user", JSON.stringify(u));
    else localStorage.removeItem("sneakershub-user");
  };

  const [isGuest, setIsGuest] = useState(false);
  // Start with loading = true regardless of cache
  const [loading, setLoading] = useState(true);
  const [needsRole, setNeedsRole] = useState(false);
  const [pendingSession, setPendingSession] = useState<{ id: string; email: string; name: string } | null>(null);

  // Track if we've completed initial session check
  const initialCheckDone = useRef(false);

  const fetchProfile = async (id: string, email: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) return null;
      const profile = data as Profile;
      if (!profile.role) return null;
      return { id: profile.id, name: profile.name, email, role: profile.role };
    } catch {
      return null;
    }
  };

  const handleSession = async (session: Session | null) => {
    try {
      if (!session?.user) {
        setUser(null);
        setNeedsRole(false);
        setPendingSession(null);
        return;
      }

      const profile = await fetchProfile(session.user.id, session.user.email ?? "");

      if (!profile) {
        const name =
          session.user.user_metadata?.full_name ??
          session.user.user_metadata?.name ??
          session.user.email?.split("@")[0] ??
          "User";
        setPendingSession({ id: session.user.id, email: session.user.email ?? "", name });
        setNeedsRole(true);
        setUser(null);
      } else {
        setUser(profile);
        setNeedsRole(false);
        setPendingSession(null);
      }
    } catch (err) {
      console.error("[Auth] handleSession error:", err);
    } finally {
      // Only mark loading as done after first session check
      if (!initialCheckDone.current) {
        initialCheckDone.current = true;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // 1. Get current session immediately
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await handleSession(session);
    }).catch((err) => {
      console.error("[Auth] getSession error:", err);
      if (!initialCheckDone.current) {
        initialCheckDone.current = true;
        setLoading(false);
      }
    });

    // 2. Listen for future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session: Session | null) => {
        if (event === "PASSWORD_RECOVERY") return;
        await handleSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

// Add this to your AuthProvider to refresh session periodically
useEffect(() => {
  // Refresh session every 10 minutes to keep it alive
  const interval = setInterval(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.auth.refreshSession();
    }
  }, 10 * 60 * 1000); // 10 minutes

  return () => clearInterval(interval);
}, []);


  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    setIsGuest(false);
  };

  const signup = async (name: string, email: string, password: string, role: "buyer" | "seller") => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Signup failed");
    setIsGuest(false);
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw new Error(error.message);
  };

  const assignRole = async (role: "buyer" | "seller") => {
    if (!pendingSession) return;
    const { id, email, name } = pendingSession;
    const { error } = await supabase.from("profiles").upsert({ id, name, role });
    if (error) throw new Error(error.message);
    setUser({ id, name, email, role });
    setNeedsRole(false);
    setPendingSession(null);
    setIsGuest(false);
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    setUser(null);
    setLoading(false); // Guest mode should stop loading
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsGuest(false);
    setNeedsRole(false);
    setPendingSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user, isGuest,
      isAuthenticated: !!user || isGuest,
      loading, needsRole,
      login, signup, signInWithGoogle, assignRole, continueAsGuest, logout, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};