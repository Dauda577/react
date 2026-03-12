import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const SAFARI_NOTIF_KEY = "sneakershub-safari-notif-prompted";

const isSafariStandalone = () => {
  if (typeof window === "undefined") return false;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || (window.navigator as any).standalone === true;
  // Detect Safari / WebKit (iOS)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    || /iPad|iPhone|iPod/.test(navigator.userAgent);
  return isStandalone && isSafari;
};

const SafariNotifPrompt = () => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [state, setState] = useState<"idle" | "granted" | "denied">("idle");

  useEffect(() => {
    if (!user) return; // only show when logged in
    if (!isSafariStandalone()) return;
    if (!("Notification" in window)) return;
    if ((window as any)?.Notification?.permission !== "default") return;
    if (localStorage.getItem(SAFARI_NOTIF_KEY)) return;

    // Slight delay so the app feels settled before prompting
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, [user]);

  const handleEnable = async () => {
    try {
      const result = await (window as any).Notification?.requestPermission?.();
      setState(result === "granted" ? "granted" : "denied");
      localStorage.setItem(SAFARI_NOTIF_KEY, "true");
      // Auto-close after showing result
      setTimeout(() => setShow(false), 2200);
    } catch {
      setState("denied");
      localStorage.setItem(SAFARI_NOTIF_KEY, "true");
      setTimeout(() => setShow(false), 2200);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(SAFARI_NOTIF_KEY, "true");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="fixed bottom-6 left-4 right-4 z-50 max-w-sm mx-auto"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <p className="font-display font-bold text-sm">Enable notifications</p>
              </div>
              <button
                onClick={handleDismiss}
                className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <p className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed">
              Get notified about new orders, messages, and shipping updates.
            </p>

            <div className="px-4 pb-4 space-y-2">
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-background">
                <div className="flex items-center gap-2.5">
                  {state === "granted" ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Bell className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-semibold">
                      {state === "granted"
                        ? "Notifications enabled ✓"
                        : state === "denied"
                        ? "Notifications blocked"
                        : "Stay in the loop"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {state === "granted"
                        ? "You'll be notified about orders & messages"
                        : state === "denied"
                        ? "Go to iOS Settings → SneakersHub → Notifications"
                        : "Orders, messages & shipping updates"}
                    </p>
                  </div>
                </div>
                {state === "idle" && (
                  <button
                    onClick={handleEnable}
                    className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 transition-all flex-shrink-0"
                  >
                    Enable
                  </button>
                )}
              </div>

              {state === "idle" && (
                <button
                  onClick={handleDismiss}
                  className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground transition-colors pt-1"
                >
                  Maybe later
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SafariNotifPrompt;