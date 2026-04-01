import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { thumbImage } from "@/lib/imageutils";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Cart = () => {
  const { items, removeItem, totalPrice, totalItems } = useCart();
  const { user, activeMode, switchMode } = useAuth();
  const navigate = useNavigate();

  // Check if user is in seller mode
  if (activeMode === "seller") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 section-padding max-w-4xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <ShoppingBag className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">You're in Seller Mode</h1>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Switch to Buyer mode to view your cart and shop for sneakers
          </p>
          <button
            onClick={() => switchMode("buyer")}
            className="btn-primary px-6 py-3 rounded-full"
          >
            Switch to Buyer Mode
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  // ✅ FIX: Check for own items before checkout
  const handleCheckout = () => {
    // Check if any item in cart belongs to the user
    const hasOwnItem = items.some(item => item.listing.sellerId === user?.id);
    
    if (hasOwnItem) {
      toast.error("You cannot purchase your own items", {
        description: "Please remove your own listings from cart",
        duration: 5000,
      });
      return;
    }
    
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 section-padding max-w-4xl mx-auto min-h-[70vh]" style={{ paddingTop: `calc(96px + env(safe-area-inset-top, 0px))` }}>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-4xl font-bold tracking-tight"
        >
          Your Cart
          {totalItems > 0 && <span className="text-muted-foreground text-2xl ml-3">({totalItems})</span>}
        </motion.h1>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg">Your cart is empty</p>
            <Link to="/shop">
              <Button className="btn-primary mt-6 rounded-full px-8">
                Start Shopping <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="mt-8 space-y-4">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={`${item.listing.id}-${item.size}`}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
                >
                  <Link to={`/product/${item.listing.id}`} className="w-20 h-20 bg-secondary rounded-lg flex-shrink-0 flex items-center justify-center p-2">
                    <img src={thumbImage(item.listing.image)} alt={item.listing.name} className="w-full h-full object-contain" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">{item.listing.brand}</p>
                    <p className="font-display font-semibold truncate">{item.listing.name}</p>
                    <p className="text-sm text-muted-foreground">Size {item.size} · Qty {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-display font-bold">GHS {item.listing.price * item.quantity}</p>
                    <button
                      onClick={() => removeItem(item.listing.id, item.size)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Summary */}
            <motion.div layout className="border-t border-border pt-6 mt-6">
              <div className="flex justify-between items-center mb-6">
                <span className="text-muted-foreground">Total</span>
                <span className="font-display text-2xl font-bold">GHS {totalPrice}</span>
              </div>
              <Button
                onClick={handleCheckout}
                className="btn-primary w-full h-14 rounded-full text-sm"
              >
                Checkout <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Cart;