import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { thumbImage } from "@/lib/imageUtils";
import { useCart } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Cart = () => {
  const { items, removeItem, totalPrice, totalItems } = useCart();
  const navigate = useNavigate();

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
                  key={`${item.sneaker.id}-${item.size}`}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
                >
                  <Link to={`/product/${item.sneaker.id}`} className="w-20 h-20 bg-secondary rounded-lg flex-shrink-0 flex items-center justify-center p-2">
                    <img src={thumbImage(item.sneaker.image)} alt={item.sneaker.name} className="w-full h-full object-contain" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">{item.sneaker.brand}</p>
                    <p className="font-display font-semibold truncate">{item.sneaker.name}</p>
                    <p className="text-sm text-muted-foreground">Size {item.size} · Qty {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-display font-bold">GHS {item.sneaker.price * item.quantity}</p>
                    <button
                      onClick={() => removeItem(item.sneaker.id, item.size)}
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
                onClick={() => navigate("/checkout")}
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