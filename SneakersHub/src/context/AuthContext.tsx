import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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

const Spinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsRole, setNeedsRole] = useState(false);
  const [pendingSession, setPendingSession] = useState<{ id: string; email: string; name: string } | null>(null);

  const fetchProfile = async (id: string, email: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    const profile = data as Profile;
    // If profile exists but has no role, treat as new user
    if (!profile.role) return null;
    return { id: profile.id, name: profile.name, email, role: profile.role };
  };

  const handleSession = async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      setNeedsRole(false);
      setPendingSession(null);
      return;
    }

    const profile = await fetchProfile(session.user.id, session.user.email ?? "");

    console.log("[Auth] user id:", session.user.id, "profile:", profile);

    if (!profile) {
      // No profile or no role — show role picker
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
  };

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 3000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      await handleSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session: Session | null) => {
        await handleSession(session);
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
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
      {loading ? <Spinner /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};