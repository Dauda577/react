import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, CheckCircle, Send } from "lucide-react";
import { useRatings } from "@/context/RatingContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  orderId: string;
  sellerId?: string;
  onClose: () => void;
  onConfirmed: () => void; // called after rating submitted OR skipped
};

const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

const RatingModal = ({ orderId, sellerId = "default-seller", onClose, onConfirmed }: Props) => {
  const { addReview } = useRatings();
  const { user } = useAuth();
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"rate" | "success">("rate");

  const active = hovered || stars;

  const handleSubmit = async () => {
    if (stars === 0) { toast.error("Please select a star rating"); return; }
    setLoading(true);
    try {
      await addReview({
        orderId,
        sellerId,
        buyerId: user?.id ?? "",
        buyerName: user?.name ? user.name.split(" ")[0] + " " + (user.name.split(" ")[1]?.[0] ?? "") + "." : "Buyer",
        stars,
        comment: comment.trim(),
      });
      setStep("success");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onConfirmed();
    onClose();
  };

  const handleDone = () => {
    onConfirmed();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
        onClick={(e) => { if (e.target === e.currentTarget) handleSkip(); }}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative bg-card border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
        >
          {/* ── Rate step ── */}
          {step === "rate" && (
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-display font-bold text-base">Rate your seller</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    How was your experience with this order?
                  </p>
                </div>
                <button onClick={handleSkip}
                  className="w-7 h-7 rounded-full border border-border flex items-center justify-center
                    text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Stars */}
              <div className="flex items-center justify-center gap-2 my-6">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.button
                    key={n}
                    whileTap={{ scale: 0.85 }}
                    whileHover={{ scale: 1.15 }}
                    onClick={() => setStars(n)}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-9 h-9 transition-colors duration-150 ${
                        n <= active
                          ? "text-amber-400 fill-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </motion.button>
                ))}
              </div>

              {/* Label */}
              <div className="text-center h-5 mb-4">
                {active > 0 && (
                  <motion.p
                    key={active}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm font-display font-semibold text-amber-500"
                  >
                    {labels[active]}
                  </motion.p>
                )}
              </div>

              {/* Comment */}
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Leave a comment (optional)..."
                rows={3}
                maxLength={200}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                  placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1
                  focus:ring-primary/20 transition-all font-[inherit] resize-none mb-1"
              />
              <p className="text-[10px] text-muted-foreground text-right mb-4">{comment.length}/200</p>

              {/* Buttons */}
              <Button onClick={handleSubmit} disabled={loading || stars === 0}
                className="btn-primary w-full h-11 rounded-full text-sm font-display">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <motion.div animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" /> Submit Review
                  </span>
                )}
              </Button>
              <button onClick={handleSkip}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors mt-3 py-1">
                Skip for now
              </button>
            </div>
          )}

          {/* ── Success step ── */}
          {step === "success" && (
            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.05 }}
                className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4"
              >
                <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <p className="font-display font-bold text-lg tracking-tight mb-1">Thanks for your review!</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Your feedback helps buyers trust great sellers.
                </p>
                <Button onClick={handleDone} className="btn-primary rounded-full h-10 px-8 text-sm font-display">
                  <CheckCircle className="w-4 h-4 mr-2" /> Done
                </Button>
              </motion.div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RatingModal;