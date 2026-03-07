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
  needsRole: boolean; // true for new Google users who haven't picked a role yet
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: "buyer" | "seller") => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  assignRole: (role: "buyer" | "seller") => Promise<void>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

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

    if (!profile) {
      // New Google user — no profile yet, needs role assignment
      const name = session.user.user_metadata?.full_name
        ?? session.user.user_metadata?.name
        ?? session.user.email?.split("@")[0]
        ?? "User";
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await handleSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session: Session | null) => {
        await handleSession(session);
      }
    );

    return () => subscription.unsubscribe();
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
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw new Error(error.message);
  };

  // Called after Google sign-in when user selects their role
  const assignRole = async (role: "buyer" | "seller") => {
    if (!pendingSession) return;
    const { id, email, name } = pendingSession;

    // Upsert profile with chosen role
    const { error } = await supabase.from("profiles").upsert({
      id,
      name,
      role,
    });
    if (error) throw new Error(error.message);

    setUser({ id, name, email, role });
    setNeedsRole(false);
    setPendingSession(null);
    setIsGuest(false);
  };

  const continueAsGuest = () => { setIsGuest(true); setUser(null); };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsGuest(false);
    setNeedsRole(false);
    setPendingSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user, isGuest, isAuthenticated: !!user || isGuest, loading, needsRole,
      login, signup, signInWithGoogle, assignRole, continueAsGuest, logout,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};