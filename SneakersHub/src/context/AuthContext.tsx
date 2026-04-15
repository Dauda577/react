import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase, Profile } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";

type User = {
  id: string;
  name: string;
  email: string;
  role: "buyer" | "seller";
  isBuyer: boolean;
  isSeller: boolean;
  sellerAppStatus: "none" | "pending" | "approved" | "rejected";
};

type AuthContextType = {
  user: User | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  needsRole: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: "buyer" | "seller", phone: string) => Promise<User | null>;
  signInWithGoogle: () => Promise<void>;
  assignRole: (role: "buyer" | "seller", phone: string) => Promise<void>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  activeMode: "buyer" | "seller";
  switchMode: (mode: "buyer" | "seller") => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const CACHE_KEY = "sneakershub-user";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
};

const setCookie = (name: string, value: string, maxAge = COOKIE_MAX_AGE) => {
  if (typeof document === "undefined") return;
  const expires = `max-age=${maxAge}; path=/; samesite=strict`;
  document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}`;
};

const deleteCookie = (name: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; max-age=0; path=/; samesite=strict`;
};

const getCachedUser = (): User | null => {
  try {
    const cookieValue = getCookie(CACHE_KEY);
    if (cookieValue) return JSON.parse(cookieValue) as User;
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) as User : null;
  } catch { return null; }
};

const setCachedUser = (u: User | null) => {
  try {
    if (u) {
      const serialized = JSON.stringify(u);
      localStorage.setItem(CACHE_KEY, serialized);
      setCookie(CACHE_KEY, serialized, COOKIE_MAX_AGE);
    } else {
      localStorage.removeItem(CACHE_KEY);
      deleteCookie(CACHE_KEY);
    }
  } catch { }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const cachedUser = getCachedUser();

  const [user, setUserState] = useState<User | null>(cachedUser);
  const [activeMode, setActiveMode] = useState<"buyer" | "seller">(cachedUser?.role ?? "buyer");
  const [loading, setLoading] = useState(!cachedUser);
  const [isGuest, setIsGuest] = useState(false);
  const [needsRole, setNeedsRole] = useState(false);

  const [pendingSession, setPendingSession] = useState<{
    id: string; email: string; name: string; avatarUrl?: string;
  } | null>(null);

  const loadingDone = useRef(false);

  const setUser = (u: User | null) => {
    setUserState(u);
    setCachedUser(u);
    if (u) setActiveMode(u.role);
  };

  const doneLoading = () => {
    if (loadingDone.current) return;
    loadingDone.current = true;
    setLoading(false);
  };

  const fetchProfile = async (id: string, email: string): Promise<User | null> => {
    try {
      const [{ data, error }, { data: app }] = await Promise.all([
        supabase.from("profiles").select("id, name, role, is_seller").eq("id", id).maybeSingle(),
        supabase.from("seller_applications").select("status").eq("user_id", id).order("submitted_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (error || !data) return null;
      const profile = data as any;
      const role = profile.role ?? "buyer";
      const isSeller = profile.role === "seller" || profile.is_seller === true;
      const isBuyer = profile.role === "buyer" || profile.is_seller === true;
      const sellerAppStatus: User["sellerAppStatus"] = isSeller ? "none" : ((app?.status ?? "none") as User["sellerAppStatus"]);
      return { id: profile.id, name: profile.name, email, role: profile.role, isBuyer, isSeller, sellerAppStatus };
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

      const cached = getCachedUser();
      if (cached && cached.id === session.user.id) {
        setUserState(cached);
        doneLoading();
        fetchProfile(session.user.id, session.user.email ?? "").then((fresh) => {
          if (fresh) {
            setUser(fresh);
          } else {
            supabase.auth.signOut().then(() => {
              setUser(null);
              localStorage.removeItem(CACHE_KEY);
              sessionStorage.clear();
            });
          }
        });
        return;
      }

      const profile = await fetchProfile(session.user.id, session.user.email ?? "");

      if (!profile) {
        const isNewOAuth = (session.user.identities?.length ?? 0) > 0 &&
          session.user.app_metadata?.provider !== "email";
        const accountAge = Date.now() - new Date(session.user.created_at).getTime();
        const isVeryNew = accountAge < 300_000;

        if (isNewOAuth || isVeryNew) {
          const name =
            session.user.user_metadata?.full_name ??
            session.user.user_metadata?.name ??
            session.user.email?.split("@")[0] ??
            "User";

          const avatarUrl =
            session.user.user_metadata?.avatar_url ??
            session.user.user_metadata?.picture ??
            undefined;

          setPendingSession({
            id: session.user.id,
            email: session.user.email ?? "",
            name,
            avatarUrl,
          });
          setNeedsRole(true);
          setUser(null);
        } else {
          supabase.auth.signOut().then(() => {
            setUser(null);
            setNeedsRole(false);
            setPendingSession(null);
            localStorage.removeItem(CACHE_KEY);
            sessionStorage.clear();
          });
        }
      } else {
        setUser(profile);
        setNeedsRole(false);
        setPendingSession(null);
      }
    } catch (err) {
      console.error("[Auth] handleSession error:", err);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!loadingDone.current) {
        console.warn("[Auth] Safety timeout - forcing loading to false");
        doneLoading();
      }
    }, 3000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await handleSession(session);
      doneLoading();
    }).catch((err) => {
      console.error("[Auth] getSession error:", err);
      doneLoading();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") return;
        await handleSession(session);
        doneLoading();
      }
    );

    const interval = setInterval(async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.user) return;
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("id", currentSession.user.id).maybeSingle();
      if (!profile) {
        await supabase.auth.signOut();
        setUser(null);
        setNeedsRole(false);
        setPendingSession(null);
        localStorage.removeItem(CACHE_KEY);
        sessionStorage.clear();
      }
    }, 60_000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (data.session?.user) {
      const profile = await fetchProfile(data.session.user.id, data.session.user.email ?? "");
      if (profile) setUser(profile);
    }
    setIsGuest(false);
  };

  const signup = async (name: string, email: string, password: string, role: "buyer" | "seller", phone: string): Promise<User | null> => {
    try {
      console.log("Starting signup with:", { name, email, role, phone });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role, phone } },
      });

      if (error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes("already registered") ||
          errorMessage.includes("already exists") ||
          errorMessage.includes("duplicate key") ||
          errorMessage.includes("user already registered")) {
          // Create a custom error with a flag to indicate it's a duplicate email error
          const duplicateError = new Error("An account with this email already exists. Try signing in instead.");
          (duplicateError as any).isDuplicateEmail = true;
          (duplicateError as any).email = email;
          throw duplicateError;
        }
        throw new Error(error.message);
      }

      if (!data.user) throw new Error("Signup failed - no user created");

      console.log("Auth user created successfully:", data.user.id);

      const newUser: User = {
        id: data.user.id, name, email, role,
        isBuyer: true, isSeller: role === "seller", sellerAppStatus: "none",
      };

      setUser(newUser);
      setNeedsRole(false);
      setPendingSession(null);
      setIsGuest(false);

      console.log("Signup complete, user set");

      return newUser;
    } catch (err: any) {
      console.error("Signup error caught in catch:", err);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw new Error(error.message);
  };

  const assignRole = async (role: "buyer" | "seller", phone: string) => {
    if (!pendingSession) {
      console.error("❌ No pending session found!");
      return;
    }

    const { id, email, name, avatarUrl } = pendingSession;

    console.log("📝 Assigning role with:", { id, email, name, role, phone });

    const profileData = {
      id,
      name,
      email,
      phone: phone || null,
      role,
      is_seller: role === "seller",
      listing_count: 0,
      commission_rate: 5,
      verified: false,
      is_official: false,
      avatar_url: avatarUrl ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("📝 Upserting profile:", profileData);

    const { error } = await supabase
      .from("profiles")
      .update({ phone, role, is_seller: role === "seller", avatar_url: avatarUrl ?? null })
      .eq("id", id);

    if (error) {
      console.error("❌ Profile upsert error:", error);
      throw new Error(error.message);
    }

    console.log("✅ Profile upserted successfully");

    setUser({
      id, name, email, role,
      isBuyer: true, isSeller: role === "seller", sellerAppStatus: "none",
    });
    setNeedsRole(false);
    setPendingSession(null);
    setIsGuest(false);
  };

  const continueAsGuest = () => { setIsGuest(true); setUser(null); };

  const switchMode = (mode: "buyer" | "seller") => {
    if (!user) return;
    if (mode === "seller" && !user.isSeller) return;
    if (mode === "buyer" && !user.isBuyer) return;
    setActiveMode(mode);
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
    deleteCookie(CACHE_KEY);
  };

  return (
    <AuthContext.Provider value={{
      user, isGuest,
      isAuthenticated: !!user || isGuest,
      loading, needsRole,
      login, signup, signInWithGoogle, assignRole, continueAsGuest, logout, resetPassword,
      activeMode, switchMode,
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