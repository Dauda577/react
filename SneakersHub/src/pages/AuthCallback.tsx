import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handle = async () => {
      // Wait for Supabase to parse the OAuth tokens from the URL
      const { data: { session }, error } = await supabase.auth.getSession();

      console.log("AuthCallback - session:", session?.user?.id, "error:", error?.message);

      if (error || !session) {
        console.log("No session, redirecting to /auth");
        navigate("/auth", { replace: true });
        return;
      }

      // Check if this user has a profile with a role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      console.log("AuthCallback - profile:", profile, "profileError:", profileError?.message);

      if (!profile?.role) {
        console.log("No role found, going to /auth for role picker");
        navigate("/auth", { replace: true });
      } else {
        console.log("Has role:", profile.role, "going to /");
        navigate("/", { replace: true });
      }
    };

    handle();
  }, []);

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