import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, CheckCircle, Star, CreditCard } from "lucide-react";
import { Listing, BOOST_FEE, BOOST_DURATION, useListings } from "@/context/ListingContext";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const PAYSTACK_PUBLIC_KEY = "pk_test_7aace9866757c00def7dfc738b254232499b8032";

type Step = "confirm" | "success";
type Props = { listing: Listing; onClose: () => void };

// Inject Paystack script once globally
function ensurePaystackScript(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).PaystackPop) { resolve(); return; }
    const existing = document.getElementById("paystack-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.id = "paystack-script";
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

const BoostModal = ({ listing, onClose }: Props) => {
  const { boostListing } = useListings();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("confirm");
  const [loading, setLoading] = useState(false);

  // Preload script as soon as modal opens
  useEffect(() => { ensurePaystackScript(); }, []);

  const handlePay = async () => {
    if (!user?.email) {
      toast.error("You must be logged in to boost a listing");
      return;
    }

    setLoading(true);

    try {
      await ensurePaystackScript();
    } catch {
      toast.error("Could not load payment SDK. Check your internet connection.");
      setLoading(false);
      return;
    }

    const PaystackPop = (window as any).PaystackPop;
    if (!PaystackPop) {
      toast.error("Payment SDK not available. Please refresh and try again.");
      setLoading(false);
      return;
    }

    const ref = `boost_${listing.id.slice(0, 8)}_${Date.now()}`;

    PaystackPop.newTransaction({
      key: PAYSTACK_PUBLIC_KEY,
      email: user.email,
      amount: BOOST_FEE * 100,
      currency: "GHS",
      ref,
      channels: ["card", "mobile_money"],
      label: `Boost: ${listing.name}`,
      onSuccess: async (transaction: { reference: string }) => {
        try {
          await boostListing(listing.id);
          setStep("success");
          toast.success("Listing boosted!");
        } catch {
          toast.error(`Payment done (ref: ${transaction.reference}) but boost failed. Contact support.`);
        }
        setLoading(false);
      },
      onCancel: () => {
        toast("Payment cancelled");
        setLoading(false);
      },
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        onClick={(e) => { if (e.target === e.currentTarget && step !== "success") onClose(); }}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative bg-card border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
        >
          {step !== "success" && (
            <button onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 rounded-full border border-border flex items-center justify-center
                text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors z-10">
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {step === "confirm" && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-display font-bold text-base">Boost this Listing</p>
                  <p className="text-xs text-muted-foreground">Get premium placement for {BOOST_DURATION} days</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border mb-5">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {listing.image
                    ? <img src={listing.image} alt={listing.name} className="w-full h-full object-contain p-1" />
                    : <span className="text-xl">👟</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{listing.name}</p>
                  <p className="text-xs text-muted-foreground">{listing.brand} · GHS {listing.price}</p>
                </div>
              </div>

              <div className="space-y-2.5 mb-6">
                {[
                  { icon: Star, text: "Featured on the homepage for 7 days" },
                  { icon: Zap, text: `"Featured" badge on your listing` },
                  { icon: CheckCircle, text: "First in all search results" },
                  { icon: CheckCircle, text: "Higher visibility to all buyers" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3 h-3 text-amber-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Boost fee</span>
                <span className="font-display font-bold text-xl text-amber-600">GHS {BOOST_FEE}</span>
              </div>

              <Button
                onClick={handlePay}
                disabled={loading}
                className="w-full h-11 rounded-full font-display font-semibold text-sm
                  bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:brightness-110 transition-all"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <motion.div animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Opening payment...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Pay GHS {BOOST_FEE} with Paystack
                  </span>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground mt-3">
                Secured by Paystack · Card & MoMo accepted
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5"
              >
                <Zap className="w-8 h-8 text-amber-500" />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <p className="font-display font-bold text-xl tracking-tight mb-2">You're Featured! 🎉</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-1">
                  <span className="font-semibold text-foreground">{listing.name}</span> is now live in the Featured section.
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  Your boost runs for {BOOST_DURATION} days and appears first in all search results.
                </p>
                <Button onClick={onClose} className="btn-primary rounded-full h-10 px-8 text-sm font-display">
                  Done
                </Button>
              </motion.div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BoostModal;