import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle, AlertCircle, Phone, Gift } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import InstallPrompt from "@/components/InstallPrompt";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "signup" | "forgot";

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const Auth = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", referralCode: "" });
  const [googlePhone, setGooglePhone] = useState("");
  const [triggerInstall, setTriggerInstall] = useState(false);

  const { login, signup, signInWithGoogle, needsRole, assignRole, continueAsGuest, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Check for referral code in URL and pre-fill
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      const code = ref.toUpperCase();
      setForm(prev => ({ ...prev, referralCode: code }));
      sessionStorage.setItem("pending_referral_code", code);
      setMode("signup");
    }
  }, []);

  const afterAuth = (destination = "/") => {
    navigate(destination);
    setTriggerInstall(true);
    if (typeof window !== "undefined" && "Notification" in window && (window as any).Notification?.permission === "default") {
      (window as any).Notification?.requestPermission?.().catch(() => { });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.email || !form.password) { toast.error("Please fill in all fields"); return; }
    if (mode === "signup" && !form.name) { toast.error("Please enter your name"); return; }
    if (mode === "signup" && !form.phone) { toast.error("Please enter your phone number"); return; }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        toast.success("Welcome back!");
        afterAuth("/");
      } else {
        // Sign up the user
        const newUser = await signup(form.name, form.email, form.password, "buyer", form.phone);

        // If a referral code was entered, call the edge function
        if (form.referralCode.trim() && newUser?.id) {
          try {
            const res = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-referral`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  referee_id: newUser.id,
                  referral_code: form.referralCode.trim().toUpperCase(),
                }),
              }
            );
            const data = await res.json();
            if (data.success) {
              toast.success(`🎉 Referral applied! Your 15% discount code: ${data.referee_reward.promo_code}`);
            } else {
              if (data.error === "This referral code has reached its limit") {
                toast.info("This referral code has reached its maximum uses — but your account was created successfully!");
              } else if (data.error === "Referral already used") {
                toast.info("You've already used a referral code before.");
              }
              // Other errors like invalid code are silently ignored — signup still succeeds
            }
          } catch {
            // Silent — referral failure shouldn't block signup
          }
        }

        toast.success("Account created! Please check your email for confirmation.");
        // Don't redirect immediately - they need to confirm email
      }
    } catch (err: any) {
      // Enhanced error handling for duplicate emails
      if (err.isDuplicateEmail) {
        toast.error(err.message, {
          duration: 8000,
          action: {
            label: "Sign In",
            onClick: () => {
              setMode("login");
              // Pre-fill the email field
              setForm(prev => ({ ...prev, email: err.email || form.email }));
            }
          }
        });
      } else {
        toast.error(err.message ?? "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!form.email) { toast.error("Enter your email address first"); return; }
    setLoading(true);
    try {
      await resetPassword(form.email);
      setForgotSent(true);
      toast.success("Password reset email sent!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    // Save referral code before OAuth redirect wipes state
    const currentRef = form.referralCode || sessionStorage.getItem("pending_referral_code");
    if (currentRef) sessionStorage.setItem("pending_referral_code", currentRef);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err.message ?? "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  const handleSkip = () => { continueAsGuest(); navigate("/account"); };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setForgotSent(false);
    setForm({ name: "", email: "", password: "", phone: "", referralCode: "" });
  };

  // ── Role picker for new Google users ────────────────────────────────────────
  if (needsRole) {
    const savedRef = sessionStorage.getItem("pending_referral_code");

    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 w-full max-w-md px-6 py-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em] mb-2">One last step</p>
            <h1 className="font-display text-3xl font-bold tracking-tighter">Almost there!</h1>
            <p className="text-muted-foreground text-sm mt-2">Just add your phone number to complete your account.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-background p-6 shadow-sm space-y-4">

            {/* Show referral code banner if one is pending */}
            {savedRef && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
                <Gift className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-xs text-green-700">
                  Referral code <span className="font-mono font-bold">{savedRef}</span> will be applied automatically
                </p>
              </div>
            )}

            <div>
              <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                Phone Number <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={googlePhone}
                  onChange={(e) => setGooglePhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]"
                />
              </div>
            </div>

            <button
              onClick={async () => {
                if (!googlePhone.trim()) { toast.error("Please enter your phone number"); return; }
                try {
                  await assignRole("buyer", googlePhone.trim());

                  // Auto-fire referral if code was saved
                  const refCode = sessionStorage.getItem("pending_referral_code");
                  if (refCode) {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user?.id) {
                      try {
                        const res = await fetch(
                          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-referral`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              referee_id: session.user.id,
                              referral_code: refCode,
                            }),
                          }
                        );
                        const data = await res.json();
                        if (data.success) {
                          toast.success(`🎉 Referral applied! Your 15% discount: ${data.referee_reward.promo_code}`);
                        } else {
                          if (data.error === "This referral code has reached its limit") {
                            toast.info("This referral code has reached its maximum uses — but your account was created successfully!");
                          } else if (data.error === "Referral already used") {
                            toast.info("You've already used a referral code before.");
                          }
                        }
                      } catch { /* silent */ }
                      finally {
                        sessionStorage.removeItem("pending_referral_code");
                      }
                    }
                  }

                  toast.success("Account created!");
                  afterAuth("/");
                } catch (err: any) {
                  toast.error(err.message ?? "Failed to set account type");
                }
              }}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm hover:bg-primary/90 transition-colors">
              Continue to SneakersHub
            </button>
            <p className="text-xs text-muted-foreground text-center">You can start selling anytime from your Account settings.</p>
          </motion.div>
        </div>
        <InstallPrompt triggerAfterAuth={triggerInstall} />
      </div>
    );
  }

  // ── Main auth form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6 py-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center mb-8">
          <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em] mb-2">Sneakers Hub</p>
          <h1 className="font-display text-4xl font-bold tracking-tighter">
            {mode === "login" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset Password"}
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            {mode === "login" ? "Sign in to access your account"
              : mode === "signup" ? "Join the sneaker community"
                : "We'll send you a reset link"}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-border bg-background p-6 shadow-sm">

          {/* Mode toggle */}
          {mode !== "forgot" && (
            <div className="flex p-1 rounded-xl bg-secondary mb-6">
              {(["login", "signup"] as const).map((m) => (
                <button key={m} onClick={() => switchMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-display font-semibold transition-all duration-200
                    ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {m === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>
          )}

          {/* Forgot password */}
          {mode === "forgot" ? (
            <AnimatePresence mode="wait">
              <motion.div key="forgot" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="space-y-4">
                {forgotSent ? (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                    <p className="text-sm font-medium">Check your email for the reset link.</p>
                    <p className="text-xs text-muted-foreground">Didn't receive it? Check your spam folder.</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input name="email" type="email" value={form.email} onChange={handleChange}
                          placeholder="you@email.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
                      </div>
                    </div>
                    <Button onClick={handleForgotPassword} disabled={loading} className="btn-primary w-full h-11 rounded-full text-sm">
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                          Sending...
                        </span>
                      ) : "Send Reset Link"}
                    </Button>
                  </>
                )}
                <button onClick={() => switchMode("login")}
                  className="w-full text-center text-sm text-primary hover:opacity-70 transition-opacity font-medium">
                  ← Back to Sign In
                </button>
              </motion.div>
            </AnimatePresence>
          ) : (
            <>
              {/* Google */}
              <button onClick={handleGoogle} disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 h-11 rounded-full border border-border
                  hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-sm font-medium mb-5
                  disabled:opacity-50 disabled:cursor-not-allowed">
                {googleLoading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-border border-t-primary rounded-full" />
                ) : <GoogleIcon />}
                {googleLoading ? "Redirecting..." : "Continue with Google"}
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or continue with email</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">

                  {mode === "signup" && (
                    <div>
                      <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input name="name" autoComplete="name" value={form.name} onChange={handleChange}
                          placeholder="Dauda Qarsim"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange}
                        placeholder="you@email.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
                    </div>
                  </div>

                  <div>
                    <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input name="password" type={showPassword ? "text" : "password"}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        value={form.password} onChange={handleChange} placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Phone — signup only */}
                  {mode === "signup" && (
                    <div>
                      <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                        Phone Number <span className="text-primary">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={handleChange}
                          placeholder="+233 24 000 0000"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">Used for order & message SMS alerts.</p>
                    </div>
                  )}

                  {/* Referral Code — signup only */}
                  {mode === "signup" && (
                    <div>
                      <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                        Referral Code <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          name="referralCode"
                          value={form.referralCode}
                          onChange={handleChange}
                          placeholder="e.g. 9DF1431D"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm
                            focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all
                            font-mono font-[inherit] uppercase tracking-widest"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">Have a friend's referral code? Enter it here.</p>
                    </div>
                  )}

                  {mode === "login" && (
                    <div className="text-right">
                      <button onClick={() => switchMode("forgot")}
                        className="text-xs text-primary hover:opacity-70 transition-opacity font-medium">
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <Button onClick={handleSubmit} disabled={loading} className="btn-primary w-full h-11 rounded-full text-sm mt-2">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                        {mode === "login" ? "Signing in..." : "Creating account..."}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {mode === "login" ? "Sign In" : "Create Account"}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>

                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <button onClick={handleSkip}
                    className="w-full py-2.5 rounded-full border border-border text-sm text-muted-foreground
                      hover:text-foreground hover:border-primary/40 transition-all duration-200 font-medium">
                    Continue as Guest
                  </button>
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </motion.div>

        {mode !== "forgot" && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-center text-sm text-muted-foreground mt-5">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              className="text-primary font-semibold hover:opacity-70 transition-opacity">
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </motion.p>
        )}
      </div>

      <InstallPrompt triggerAfterAuth={triggerInstall} />
    </div>
  );
};

export default Auth;