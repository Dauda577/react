import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, needsRole, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (needsRole) {
      navigate("/auth", { replace: true });
    } else if (user) {
      // Auto-request notifications for Google sign-ins
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
      navigate("/", { replace: true });
    } else {
      navigate("/auth", { replace: true });
    }
  }, [user, needsRole, loading]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-border border-t-primary rounded-full"
        />
        <p className="text-sm text-muted-foreground font-medium">Signing you in...</p>
      </motion.div>
    </div>
  );
};

export default AuthCallback;