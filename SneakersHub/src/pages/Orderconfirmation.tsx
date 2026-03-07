import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCircle, MapPin, Phone, Package, ArrowRight, ShoppingBag } from "lucide-react";
import { useOrders } from "@/context/OrderContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const statusSteps = ["Order Placed", "Confirmed", "Shipped", "Delivered"];

const OrderConfirmation = () => {
  const { latestOrder } = useOrders();

  if (!latestOrder) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 section-padding max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
          <ShoppingBag className="w-14 h-14 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-6">No recent order found.</p>
          <Link to="/shop">
            <Button className="btn-primary rounded-full px-8">Shop Now <ArrowRight className="ml-2 w-4 h-4" /></Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const { id, items, buyer, delivery, total, deliveryFee, subtotal, placedAt } = latestOrder;
  const placedDate = new Date(placedAt).toLocaleDateString("en-GH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 section-padding max-w-3xl mx-auto pb-20">

        {/* Success hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-5"
          >
            <CheckCircle className="w-10 h-10 text-green-500" />
          </motion.div>
          <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em] mb-2">
            Order Confirmed
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight mb-2">
            You're all set!
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Your order has been placed. The seller will be notified and get in touch to arrange delivery.
          </p>
          <p className="text-xs text-muted-foreground mt-3 font-mono">
            {(() => {
              const num = parseInt(id.replace(/-/g, "").slice(0, 10), 16) % 1000000000;
              return `#${num.toString().padStart(9, "0")}`;
            })()}
          </p>
        </motion.div>

        {/* Order status tracker */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border p-6 mb-5"
        >
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-6">
            Order Status
          </p>
          <div className="flex items-center justify-between relative">
            {/* Progress line */}
            <div className="absolute top-4 left-0 right-0 h-px bg-border" />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "8%" }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="absolute top-4 left-0 h-px bg-primary"
            />
            {statusSteps.map((step, i) => (
              <div key={step} className="flex flex-col items-center gap-2 relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                  ${i === 0
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background border-border text-muted-foreground"
                  }`}>
                  {i === 0
                    ? <CheckCircle className="w-4 h-4" />
                    : <span className="text-xs font-bold">{i + 1}</span>
                  }
                </div>
                <span className={`text-[11px] font-medium text-center max-w-[60px] leading-tight
                  ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-6 text-center">Placed on {placedDate}</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5 mb-5">
          {/* Delivery details */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl border border-border p-5"
          >
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Delivery To
            </p>
            <p className="font-display font-semibold text-sm">{buyer.firstName} {buyer.lastName}</p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                {buyer.address}, {buyer.city}, {buyer.region}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                {buyer.phone}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Package className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                {delivery === "express" ? "Express Delivery" : delivery === "pickup" ? "Hub Pickup" : "Standard Delivery"}
              </div>
            </div>
          </motion.div>

          {/* Payment summary */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-border p-5"
          >
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Payment
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">GHS {subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className="font-medium">{deliveryFee === 0 ? "Free" : `GHS ${deliveryFee}`}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="font-display font-bold">Total</span>
                <span className="font-display font-bold">GHS {total}</span>
              </div>
            </div>
            <div className="mt-4 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-xs text-muted-foreground">
                💳 Pay with <span className="font-semibold text-foreground">Cash or MoMo</span> on delivery
              </p>
            </div>
          </motion.div>
        </div>

        {/* Items */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-2xl border border-border p-6 mb-8"
        >
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Items Ordered
          </p>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={`${item.id}-${item.size}`} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 p-1.5">
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">{item.brand}</p>
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Size {item.size} · Qty {item.quantity}</p>
                </div>
                <p className="font-display font-bold text-sm">GHS {item.price * item.quantity}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Link to="/shop" className="flex-1">
            <Button variant="outline" className="w-full rounded-full h-11 text-sm">
              Continue Shopping
            </Button>
          </Link>
          <Link
            to="/account"
            onClick={() => localStorage.setItem("account-role", "seller")}
            className="flex-1"
          >
            <Button className="btn-primary w-full rounded-full h-11 text-sm">
              View My Orders <ArrowRight className="ml-1.5 w-4 h-4" />
            </Button>
          </Link>
        </motion.div>

      </div>

      <Footer />
    </div>
  );
};

export default OrderConfirmation;