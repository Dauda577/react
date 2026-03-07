import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Tag, Store, ArrowRight, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Mode = "login" | "signup";

const Auth = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const { login, signup, continueAsGuest } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (mode === "signup" && !form.name) {
      toast.error("Please enter your name");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        toast.success("Welcome back!");
      } else {
        await signup(form.name, form.email, form.password, role);
        toast.success("Account created!");
      }
      navigate("/");  // ← goes to homepage after auth
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    continueAsGuest();
    navigate("/");   // ← goes to homepage as guest too
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setForm({ name: "", email: "", password: "" });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">

      {/* Ambient blobs */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em] mb-2">
            Sneakers Hub
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tighter">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            {mode === "login"
              ? "Sign in to access your account"
              : "Join the sneaker community"}
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-border bg-background p-6 shadow-sm"
        >
          {/* Mode toggle */}
          <div className="flex p-1 rounded-xl bg-secondary mb-6">
            {(["login", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-display font-semibold transition-all duration-200
                  ${mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Name — signup only */}
              {mode === "signup" && (
                <div>
                  <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Kwame Asante"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                        placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                        transition-all font-[inherit]"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@email.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                      placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                      transition-all font-[inherit]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                      placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                      transition-all font-[inherit]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role selector — signup only */}
              {mode === "signup" && (
                <div>
                  <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-2">
                    I want to
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "buyer", label: "Buy Sneakers", icon: Tag, desc: "Browse & purchase" },
                      { value: "seller", label: "Sell Sneakers", icon: Store, desc: "List & manage" },
                    ] as const).map(({ value, label, icon: Icon, desc }) => (
                      <button
                        key={value}
                        onClick={() => setRole(value)}
                        className={`flex flex-col items-start gap-1 p-3.5 rounded-xl border text-left transition-all duration-200
                          ${role === value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                          }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <Icon className={`w-4 h-4 ${role === value ? "text-primary" : "text-muted-foreground"}`} />
                          {role === value && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <p className={`text-sm font-display font-semibold mt-1 ${role === value ? "text-foreground" : "text-muted-foreground"}`}>
                          {label}
                        </p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Forgot password */}
              {mode === "login" && (
                <div className="text-right">
                  <button className="text-xs text-primary hover:opacity-70 transition-opacity font-medium">
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary w-full h-11 rounded-full text-sm mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                    />
                    {mode === "login" ? "Signing in..." : "Creating account..."}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {mode === "login" ? "Sign In" : "Create Account"}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Skip / continue as guest */}
              <button
                onClick={handleSkip}
                className="w-full py-2.5 rounded-full border border-border text-sm text-muted-foreground
                  hover:text-foreground hover:border-primary/40 transition-all duration-200 font-medium"
              >
                Continue as Guest
              </button>

            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Switch mode */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-sm text-muted-foreground mt-5"
        >
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => switchMode(mode === "login" ? "signup" : "login")}
            className="text-primary font-semibold hover:opacity-70 transition-opacity"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </motion.p>

      </div>
    </div>
  );
};

export default Auth;