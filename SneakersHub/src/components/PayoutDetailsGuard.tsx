// ── PayoutDetailsGuard ────────────────────────────────────────────────────────
// Drop this component at the TOP of your CreateListing.tsx return statement.
// It shows a blocking banner for verified sellers who haven't added payout details.
//
// Usage in CreateListing.tsx:
//   1. Import this component: import PayoutDetailsGuard from "@/components/PayoutDetailsGuard"
//   2. Wrap your form: <PayoutDetailsGuard><YourFormHere /></PayoutDetailsGuard>

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Wallet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type Props = { children: React.ReactNode };

const PayoutDetailsGuard = ({ children }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from("profiles")
      .select("verified, is_official, payout_method, payout_number")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) { setStatus("ok"); return; }

        // Official accounts never need payout details
        // Standard sellers use pay-on-delivery — no block needed
        // Only verified (non-official) sellers need payout details
        if (data.is_official) {
          setStatus("ok");
        } else if (data.verified && (!data.payout_method || !data.payout_number)) {
          setStatus("missing");
        } else {
          setStatus("ok");
        }
      });
  }, [user?.id]);

  if (status === "loading") return null;

  if (status === "missing") return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-5">
        <Wallet className="w-6 h-6 text-amber-500" />
      </div>

      <h2 className="font-display text-xl font-bold tracking-tight mb-2">
        Add payout details first
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-2">
        As a verified seller, buyers pay via Paystack. You need to add your MoMo or bank details so we know where to send your earnings.
      </p>
      <p className="text-xs text-muted-foreground mb-8">
        Without this, your earnings can't be paid out to you.
      </p>

      <div className="w-full max-w-xs rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 mb-6 text-left space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">What you need:</p>
        </div>
        {[
          "Your MTN MoMo, Telecel Cash, or bank account number",
          "The name registered on the account",
          "Takes less than 1 minute to set up",
        ].map((item) => (
          <div key={item} className="flex items-start gap-2 pl-6">
            <span className="text-amber-500 text-xs mt-0.5 flex-shrink-0">✓</span>
            <p className="text-xs text-muted-foreground">{item}</p>
          </div>
        ))}
      </div>

      <Button
        className="btn-primary rounded-full h-10 px-8 text-sm w-full max-w-xs"
        onClick={() => navigate("/account?tab=settings")}>
        Add Payout Details <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
      </Button>
      <button
        onClick={() => navigate(-1)}
        className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
        Go back
      </button>
    </motion.div>
  );

  return <>{children}</>;
};

export default PayoutDetailsGuard;