import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Tag, Store, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Mode = "login" | "signup" | "forgot";

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const Auth = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const { login, signup, signInWithGoogle, needsRole, assignRole, continueAsGuest, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.email || !form.password) { toast.error("Please fill in all fields"); return; }
    if (mode === "signup" && !form.name) { toast.error("Please enter your name"); return; }
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        toast.success("Welcome back!");
      } else {
        await signup(form.name, form.email, form.password, role);
        toast.success(`${role === "buyer" ? "Buyer" : "Seller"} account created!`);
      }
      navigate("/");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong. Please try again.");
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
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err.message ?? "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  const handleAssignRole = async (selectedRole: "buyer" | "seller") => {
    try {
      await assignRole(selectedRole);
      toast.success(`${selectedRole === "buyer" ? "Buyer" : "Seller"} account created!`);
      navigate("/");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to set account type");
    }
  };

  const handleSkip = () => { continueAsGuest(); navigate("/account"); };
  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setForgotSent(false);
    setForm({ name: "", email: "", password: "" });
  };

  // ── Role picker for new Google users ──
  if (needsRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 w-full max-w-md px-6 py-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em] mb-2">One last step</p>
            <h1 className="font-display text-3xl font-bold tracking-tighter">How will you use SneakersHub?</h1>
            <p className="text-muted-foreground text-sm mt-2">Your account type is permanent and can't be changed later.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-background p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "buyer", label: "Buy Sneakers", icon: Tag, desc: "Browse & purchase from sellers" },
                { value: "seller", label: "Sell Sneakers", icon: Store, desc: "List & manage your inventory" },
              ] as const).map(({ value, label, icon: Icon, desc }) => (
                <button key={value} onClick={() => handleAssignRole(value)}
                  className="flex flex-col items-start gap-1 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 text-left transition-all duration-200 group">
                  <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mb-1" />
                  <p className="text-sm font-display font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </button>
              ))}
            </div>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-600 leading-relaxed">
                Buyers and sellers use <span className="font-semibold">separate accounts</span>. Choose carefully — this cannot be changed.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

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

          {/* Mode toggle — only for login/signup */}
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

          {/* Forgot password screen */}
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
              {/* Google button */}
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

                  {mode === "signup" && (
                    <div>
                      <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-2">I want to</label>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {([
                          { value: "buyer", label: "Buy Sneakers", icon: Tag, desc: "Browse & purchase" },
                          { value: "seller", label: "Sell Sneakers", icon: Store, desc: "List & manage" },
                        ] as const).map(({ value, label, icon: Icon, desc }) => (
                          <button key={value} onClick={() => setRole(value)}
                            className={`flex flex-col items-start gap-1 p-3.5 rounded-xl border text-left transition-all duration-200
                              ${role === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                            <div className="flex items-center justify-between w-full">
                              <Icon className={`w-4 h-4 ${role === value ? "text-primary" : "text-muted-foreground"}`} />
                              {role === value && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                            </div>
                            <p className={`text-sm font-display font-semibold mt-1 ${role === value ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
                            <p className="text-xs text-muted-foreground">{desc}</p>
                          </button>
                        ))}
                      </div>
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-600 leading-relaxed">
                          Your account type is <span className="font-semibold">permanent</span>. Choose carefully.
                        </p>
                      </div>
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
    </div>
  );
};

export default Auth;