import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, ShoppingBag, ArrowRight, Minus, Plus, Tag, Shield, Truck, CreditCard } from "lucide-react";
import { thumbImage } from "@/lib/imageutils";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Cart = () => {
  const { items, removeItem, totalPrice, totalItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check for own items before checkout
  const handleCheckout = () => {
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

  // Calculate subtotal (for display purposes)
  const subtotal = totalPrice;
  const estimatedTax = 0; // No tax for now
  const orderTotal = subtotal + estimatedTax;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />

      <div className="pt-24 section-padding max-w-6xl mx-auto min-h-[70vh]" style={{ paddingTop: `calc(96px + env(safe-area-inset-top, 0px))` }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center md:text-left"
        >
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Shopping Cart
            {totalItems > 0 && (
              <span className="text-muted-foreground text-2xl ml-3">({totalItems} {totalItems === 1 ? "item" : "items"})</span>
            )}
          </h1>
          <p className="text-muted-foreground mt-2">
            {totalItems > 0
              ? "Review your items before checkout"
              : "Your cart is waiting to be filled"}
          </p>
        </motion.div>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mb-5">
              <ShoppingBag className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground text-center max-w-sm mb-6">
              Looks like you haven't added any items to your cart yet.
            </p>
            <Link to="/shop">
              <Button className="btn-primary rounded-full px-8 h-11">
                Start Shopping <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence mode="popLayout">
                {items.map((item, index) => (
                  <motion.div
                    key={`${item.listing.id}-${item.size}`}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative bg-card border border-border rounded-2xl p-4 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <Link
                        to={`/product/${item.listing.id}`}
                        className="w-24 h-24 bg-gradient-to-br from-muted/50 to-muted rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300"
                      >
                        <img
                          src={thumbImage(item.listing.image)}
                          alt={item.listing.name}
                          className="w-full h-full object-contain p-2"
                        />
                      </Link>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                              {item.listing.brand}
                            </p>
                            <Link to={`/product/${item.listing.id}`}>
                              <h3 className="font-display font-semibold text-base hover:text-primary transition-colors line-clamp-1">
                                {item.listing.name}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-sm text-muted-foreground">
                                Size: <span className="font-semibold text-foreground">{item.size}</span>
                              </span>
                              <span className="text-sm text-muted-foreground">
                                Qty: <span className="font-semibold text-foreground">{item.quantity}</span>
                              </span>
                            </div>
                            {/* Seller info */}
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground">
                                Sold by: <span className="font-medium">{item.listing.sellerName}</span>
                                {item.listing.sellerIsOfficial && (
                                  <span className="ml-1.5 text-[9px] font-bold text-purple-600 bg-purple-500/10 px-1.5 py-0.5 rounded-full">
                                    Official
                                  </span>
                                )}
                                {item.listing.sellerVerified && !item.listing.sellerIsOfficial && (
                                  <span className="ml-1.5 text-[9px] font-bold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                                    Verified
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(item.listing.id, item.size)}
                            className="p-2 rounded-full text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="absolute bottom-4 right-4">
                      <p className="font-display font-bold text-lg">
                        GH₵ {(item.listing.price * item.quantity).toLocaleString()}
                      </p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-muted-foreground text-right">
                          GH₵ {item.listing.price.toLocaleString()} each
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:sticky lg:top-24 h-fit"
            >
              <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                <h2 className="font-display text-xl font-bold">Order Summary</h2>

                {/* Items count */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({totalItems} {totalItems === 1 ? "item" : "items"})</span>
                  <span className="font-medium">GH₵ {subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Tax</span>
                  <span className="font-medium">GH₵ {estimatedTax.toLocaleString()}</span>
                </div>

                {/* Delivery Info */}
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Delivery fee calculated at checkout</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Secure payment via Paystack</span>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-display font-bold text-lg">Total</span>
                    <span className="font-display text-2xl font-bold text-primary">
                      GH₵ {orderTotal.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    Including taxes
                  </p>
                </div>

                {/* Checkout Button */}
                <Button
                  onClick={handleCheckout}
                  className="w-full h-12 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-semibold text-base gap-2 group"
                >
                  <CreditCard className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                {/* Continue Shopping */}
                <div className="text-center">
                  <Link
                    to="/shop"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                  >
                    Continue Shopping
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Trust Badges */}
                <div className="border-t border-border pt-4 mt-2">
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Shield className="w-3 h-3 text-green-500" />
                      </div>
                      <span>Secure Checkout</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Tag className="w-3 h-3 text-blue-500" />
                      </div>
                      <span>Best Prices</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Promo Code Hint */}
              <div className="mt-4 p-4 rounded-xl bg-muted/20 border border-border text-center">
                <p className="text-xs text-muted-foreground">
                  Have a promo code? Enter it at checkout
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Cart;