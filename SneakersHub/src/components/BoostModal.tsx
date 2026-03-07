import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, CheckCircle, Smartphone, Star } from "lucide-react";
import { Listing, BOOST_FEE, BOOST_DURATION, useListings } from "@/context/ListingContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Step = "confirm" | "payment" | "success";

type Props = {
  listing: Listing;
  onClose: () => void;
};

const BoostModal = ({ listing, onClose }: Props) => {
  const { boostListing } = useListings();
  const [step, setStep] = useState<Step>("confirm");
  const [momoNumber, setMomoNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!momoNumber || momoNumber.length < 10) {
      toast.error("Enter a valid MoMo number");
      return;
    }
    setLoading(true);
    // Mock payment processing — replace with real MoMo API call
    await new Promise((res) => setTimeout(res, 1800));
    boostListing(listing.id);
    setLoading(false);
    setStep("success");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative bg-card border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
        >
          {/* Close */}
          {step !== "success" && (
            <button onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 rounded-full border border-border flex items-center justify-center
                text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors z-10">
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* ── Step 1: Confirm ── */}
          {step === "confirm" && (
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-display font-bold text-base">Boost this Listing</p>
                  <p className="text-xs text-muted-foreground">Get premium placement for {BOOST_DURATION} days</p>
                </div>
              </div>

              {/* Listing preview */}
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

              {/* Benefits */}
              <div className="space-y-2.5 mb-6">
                {[
                  { icon: Star, text: "Featured on the homepage for 7 days" },
                  { icon: Zap, text: "\"Featured\" badge on your listing" },
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

              {/* Price + CTA */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Boost fee</span>
                <span className="font-display font-bold text-xl text-amber-600">GHS {BOOST_FEE}</span>
              </div>
              <Button onClick={() => setStep("payment")}
                className="w-full h-11 rounded-full font-display font-semibold text-sm
                  bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:brightness-110 transition-all">
                <Zap className="w-4 h-4 mr-2" /> Boost Now
              </Button>
            </div>
          )}

          {/* ── Step 2: Payment ── */}
          {step === "payment" && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0 border border-green-500/20">
                  <Smartphone className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-display font-bold text-base">Pay with MoMo</p>
                  <p className="text-xs text-muted-foreground">MTN MoMo / Telecel Cash</p>
                </div>
              </div>

              {/* Amount reminder */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border mb-5">
                <span className="text-sm text-muted-foreground">Amount to pay</span>
                <span className="font-display font-bold text-base">GHS {BOOST_FEE}</span>
              </div>

              {/* MoMo number input */}
              <div className="mb-5">
                <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                  Your MoMo Number
                </label>
                <input
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                  placeholder="024 XXX XXXX"
                  type="tel"
                  maxLength={12}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                    placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1
                    focus:ring-primary/20 transition-all font-[inherit]"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  You'll receive a prompt on this number to confirm the GHS {BOOST_FEE} payment.
                </p>
              </div>

              <Button onClick={handlePay} disabled={loading}
                className="w-full h-11 rounded-full font-display font-semibold text-sm btn-primary">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <motion.div animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" /> Confirm Payment
                  </span>
                )}
              </Button>
              <button onClick={() => setStep("confirm")}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors mt-3 py-1">
                ← Back
              </button>
            </div>
          )}

          {/* ── Step 3: Success ── */}
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
                  Your boost runs for {BOOST_DURATION} days.
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