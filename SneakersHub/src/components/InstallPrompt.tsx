import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, CheckCircle } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Shown after login/signup — install prompt only.
// Notifications are auto-requested in Auth.tsx / AuthCallback.tsx.
const InstallPrompt = ({ triggerAfterAuth = false }: { triggerAfterAuth?: boolean }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installState, setInstallState] = useState<"idle" | "installed">("idle");
  const isStandalone = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;

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

  // Show after auth if install is available
  useEffect(() => {
    if (!triggerAfterAuth) return;
    if (isStandalone) return;
    if (!deferredPrompt) return;
    const timer = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(timer);
  }, [triggerAfterAuth, deferredPrompt]);

  // Show delayed prompt for non-auth visitors
  useEffect(() => {
    if (triggerAfterAuth) return;
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

  const handleClose = () => setShow(false);

  const canInstall = !!deferredPrompt && installState === "idle" && !isStandalone;
  if (!canInstall) return null;

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
                <p className="font-display font-bold text-sm">Install SneakersHub</p>
              </div>
              <button onClick={handleClose}
                className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>

            <p className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed">
              Add to your home screen for quick access — no app store needed.
            </p>

            <div className="px-4 pb-4 space-y-2">
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-background">
                <div className="flex items-center gap-2.5">
                  {installState === "installed"
                    ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <Download className="w-4 h-4 text-primary flex-shrink-0" />}
                  <div>
                    <p className="text-xs font-semibold">
                      {installState === "installed" ? "Installed ✓" : "Add to home screen"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {installState === "installed" ? "Added to your home screen" : "Works offline, launches instantly"}
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