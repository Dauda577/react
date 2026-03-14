import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase, Profile } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";

type User = {
  id: string;
  name: string;
  email: string;
  role: "buyer" | "seller";
  isBuyer: boolean;  // can shop
  isSeller: boolean; // can list
  sellerAppStatus: "none" | "pending" | "approved" | "rejected"; // seller application state
};

type AuthContextType = {
  user: User | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  needsRole: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: "buyer" | "seller", phone: string) => Promise<void>;
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

const getCachedUser = (): User | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch { return null; }
};

const setCachedUser = (u: User | null) => {
  try {
    if (u) localStorage.setItem(CACHE_KEY, JSON.stringify(u));
    else localStorage.removeItem(CACHE_KEY);
  } catch {}
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const cachedUser = getCachedUser();

  // If we have a cached user, start with loading: false — show app immediately
  // If no cache, show spinner until session resolves
  const [user, setUserState] = useState<User | null>(cachedUser);
  const [activeMode, setActiveMode] = useState<"buyer" | "seller">(cachedUser?.role ?? "buyer");
  const [loading, setLoading] = useState(!cachedUser);
  const [isGuest, setIsGuest] = useState(false);
  const [needsRole, setNeedsRole] = useState(false);
  const [pendingSession, setPendingSession] = useState<{ id: string; email: string; name: string } | null>(null);

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
        supabase.from("profiles").select("id, name, role, is_seller").eq("id", id).single(),
        supabase.from("seller_applications").select("status").eq("user_id", id).order("submitted_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (error || !data) return null;
      const profile = data as any;
      if (!profile.role) return null;
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

      // If we already have this user cached, skip the profile fetch
      // Profile will still be fetched but loading won't block on it
      const cached = getCachedUser();
      if (cached && cached.id === session.user.id) {
        setUserState(cached);
        doneLoading();
        // Verify in background — update silently if profile changed
        fetchProfile(session.user.id, session.user.email ?? "").then((fresh) => {
          if (fresh) {
            setUser(fresh);
          } else {
            // Profile deleted (e.g. account deleted on another device) — force sign out
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
        // Check if this is a brand new OAuth user (has provider identity but no profile yet)
        // vs a deleted account (profile row removed). New OAuth users have identities array.
        const isNewOAuth = (session.user.identities?.length ?? 0) > 0 &&
          session.user.app_metadata?.provider !== "email";
        const accountAge = Date.now() - new Date(session.user.created_at).getTime();
        const isVeryNew = accountAge < 300_000; // created less than 5 min ago

        if (isNewOAuth || isVeryNew) {
          // Genuine new user — let them pick a role
          const name =
            session.user.user_metadata?.full_name ??
            session.user.user_metadata?.name ??
            session.user.email?.split("@")[0] ??
            "User";
          setPendingSession({ id: session.user.id, email: session.user.email ?? "", name });
          setNeedsRole(true);
          setUser(null);
        } else {
          // Profile missing for an existing session = account was deleted elsewhere
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
    // Fallback timeout — only needed for brand new users with no cache
    const timeout = setTimeout(() => {
      if (!loadingDone.current) {
        console.warn("[Auth] Safety timeout - forcing loading to false");
        doneLoading();
      }
    }, 3000); // Reduced from 5s to 3s

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

    // Periodically re-validate session — catches account deletions on other devices
    const interval = setInterval(async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.user) return; // not logged in, nothing to check
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("id", currentSession.user.id).single();
      if (!profile) {
        // Profile gone — sign out this device
        await supabase.auth.signOut();
        setUser(null);
        setNeedsRole(false);
        setPendingSession(null);
        localStorage.removeItem(CACHE_KEY);
        sessionStorage.clear();
      }
    }, 60_000); // check every 60 seconds

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    setIsGuest(false);
  };

  // ── FIXED SIGNUP FUNCTION WITH DETAILED ERROR LOGGING ─────────────────────
  const signup = async (name: string, email: string, password: string, role: "buyer" | "seller", phone: string) => {
    try {
      console.log("Starting signup with:", { name, email, role, phone });
      
      // First, create the auth user
      const { data, error } = await supabase.auth.signUp({
        email, 
        password,
        options: { 
          data: { 
            name, 
            role,
            phone // Include phone in metadata as backup
          } 
        },
      });
      
      if (error) {
        console.error("Auth signup error:", error);
        throw new Error(error.message);
      }
      
      if (!data.user) {
        console.error("No user returned from signup");
        throw new Error("Signup failed - no user created");
      }
      
      console.log("Auth user created successfully:", data.user.id);
      
      // Small delay to ensure auth user is fully created
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Log the profile data we're about to insert
      const profileData = {
        id: data.user.id,
        name: name,
        email: email,
        role: role,
        phone: phone,
        is_seller: role === "seller",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      console.log("Attempting to insert profile:", profileData);
      
      // Then create the profile with ALL required fields - using upsert instead of insert
const { error: profileError } = await supabase
  .from("profiles")
  .upsert({
    id: data.user.id,
    name: name,
    email: email,
    phone: phone,
    role: role,
    is_seller: role === "seller",
    verified: false,
    is_official: false,
    listing_count: 0,
    commission_rate: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { 
    onConflict: 'id',
    ignoreDuplicates: false // Set to false to update if exists
  });
      
      if (profileError) {
        console.error("Profile creation error - FULL DETAILS:", profileError);
        console.error("Error code:", profileError.code);
        console.error("Error message:", profileError.message);
        console.error("Error details:", profileError.details);
        console.error("Error hint:", profileError.hint);
        
        // Check if it's a duplicate key error
        if (profileError.code === '23505') {
          throw new Error("A user with this email already exists");
        } else if (profileError.code === '23502') {
          throw new Error("Missing required field: " + profileError.message);
        } else {
          throw new Error(`Database error: ${profileError.message}`);
        }
      }
      
      console.log("Profile created successfully");
      
      const newUser: User = { 
        id: data.user.id, 
        name, 
        email, 
        role, 
        isBuyer: true, 
        isSeller: role === "seller", 
        sellerAppStatus: "none" 
      };
      
      setUser(newUser);
      setNeedsRole(false);
      setPendingSession(null);
      setIsGuest(false);
      
      console.log("Signup complete, user set");
      
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
    if (!pendingSession) return;
    const { id, email, name } = pendingSession;
    const { error } = await supabase.from("profiles").upsert({ id, name, role, phone });
    if (error) throw new Error(error.message);
    setUser({ id, name, email, role });
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