import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader } from "lucide-react";
import { supabase } from "@/lib/supabase";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) { setStatus("error"); return; }

    const process = async () => {
      try {
        // Decode token: "unsub:{userId}:sneakershub"
        const decoded = atob(token);
        const parts = decoded.split(":");
        if (parts[0] !== "unsub" || parts[2] !== "sneakershub") {
          setStatus("error"); return;
        }
        const userId = parts[1];
        const { error } = await supabase
          .from("profiles")
          .update({ marketing_unsubscribed: true })
          .eq("id", userId);

        setStatus(error ? "error" : "success");
      } catch {
        setStatus("error");
      }
    };

    process();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        {status === "loading" && (
          <>
            <Loader className="w-12 h-12 text-muted-foreground animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Processing your request...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold mb-2">Unsubscribed</h1>
            <p className="text-muted-foreground text-sm mb-6">
              You've been removed from our marketing emails. You'll still receive
              order confirmations and message notifications.
            </p>
            <Link to="/" className="text-primary font-semibold text-sm hover:opacity-70 transition-opacity">
              ← Back to SneakersHub
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-14 h-14 text-destructive mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold mb-2">Invalid Link</h1>
            <p className="text-muted-foreground text-sm mb-6">
              This unsubscribe link is invalid or has already been used.
              If you're still receiving emails, contact us.
            </p>
            <Link to="/" className="text-primary font-semibold text-sm hover:opacity-70 transition-opacity">
              ← Back to SneakersHub
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Unsubscribe;