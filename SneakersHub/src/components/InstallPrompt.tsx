import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, Bell, CheckCircle } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Shown after login/signup — one popup covering both install + notifications
const InstallPrompt = ({ triggerAfterAuth = false }: { triggerAfterAuth?: boolean }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [step, setStep] = useState<"main" | "done">("main");
  const [notifState, setNotifState] = useState<"idle" | "granted" | "denied">("idle");
  const [installState, setInstallState] = useState<"idle" | "installed">("idle");
  const isStandalone = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;
  const notifSupported = typeof window !== "undefined" && "Notification" in window;
  const alreadyGranted = notifSupported && Notification.permission === "granted";

  useEffect(() => {
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstallState("installed"));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Trigger the popup after auth (called from Auth.tsx via prop or event)
  useEffect(() => {
    if (!triggerAfterAuth) return;
    if (isStandalone) return;
    // Only show if there's something useful to show
    const hasInstall = !!deferredPrompt;
    const hasNotif = notifSupported && Notification.permission === "default";
    if (!hasInstall && !hasNotif) return;

    const timer = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(timer);
  }, [triggerAfterAuth, deferredPrompt]);

  // Also show the standard delayed prompt for users who didn't come through auth
  useEffect(() => {
    if (triggerAfterAuth) return; // handled above
    if (isStandalone) return;
    if (!deferredPrompt) return;
    const timer = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(timer);
  }, [deferredPrompt, triggerAfterAuth]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstallState("installed");
    setDeferredPrompt(null);
  };

  const handleEnableNotifications = async () => {
    if (!notifSupported) return;
    const result = await Notification.requestPermission();
    setNotifState(result === "granted" ? "granted" : "denied");
  };

  const handleClose = () => {
    setShow(false);
    setStep("main");
  };

  const canInstall = !!deferredPrompt && installState === "idle" && !isStandalone;
  const canNotify = notifSupported && Notification.permission === "default" && notifState === "idle";

  // Nothing useful to show
  if (!canInstall && !canNotify) return null;

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
                  <Smartphone className="w-4 h-4 text-primary" />
                </div>
                <p className="font-display font-bold text-sm">Get the full experience</p>
              </div>
              <button onClick={handleClose}
                className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>

            <p className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed">
              Install SneakersHub and enable notifications to never miss an order or message.
            </p>

            <div className="px-4 pb-4 space-y-2">

              {/* ── Install row ── */}
              {canInstall && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-background">
                  <div className="flex items-center gap-2.5">
                    {installState === "installed"
                      ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      : <Download className="w-4 h-4 text-primary flex-shrink-0" />}
                    <div>
                      <p className="text-xs font-semibold">
                        {installState === "installed" ? "Installed ✓" : "Install app"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {installState === "installed" ? "Added to your home screen" : "Quick access, no app store needed"}
                      </p>
                    </div>
                  </div>
                  {installState === "idle" && (
                    <button onClick={handleInstall}
                      className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 transition-all flex-shrink-0">
                      Install
                    </button>
                  )}
                </div>
              )}

              {/* ── Notifications row ── */}
              {canNotify && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-background">
                  <div className="flex items-center gap-2.5">
                    {notifState === "granted"
                      ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      : notifState === "denied"
                      ? <Bell className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      : <Bell className="w-4 h-4 text-primary flex-shrink-0" />}
                    <div>
                      <p className="text-xs font-semibold">
                        {notifState === "granted" ? "Notifications on ✓"
                          : notifState === "denied" ? "Notifications blocked"
                          : "Enable notifications"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {notifState === "granted" ? "You'll be notified about orders & messages"
                          : notifState === "denied" ? "Allow via browser settings to enable"
                          : "Orders, messages & shipping updates"}
                      </p>
                    </div>
                  </div>
                  {notifState === "idle" && (
                    <button onClick={handleEnableNotifications}
                      className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 transition-all flex-shrink-0">
                      Enable
                    </button>
                  )}
                </div>
              )}

              {/* Already granted — just show install if available */}
              {alreadyGranted && !canNotify && (
                <div className="flex items-center gap-2 px-1 py-1">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <p className="text-[10px] text-green-600 font-medium">Notifications already enabled ✓</p>
                </div>
              )}

              {/* Dismiss link */}
              <button onClick={handleClose}
                className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground transition-colors pt-1">
                Maybe later
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;