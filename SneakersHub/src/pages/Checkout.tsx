import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, MapPin, Phone, User, CheckCircle,
  ShoppingBag, ChevronDown, ArrowRight, ShieldAlert, X,
  ShieldCheck, CreditCard, Lock,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useOrders } from "@/context/OrderContext";
import { usePublicListings } from "@/context/PublicListingsContext";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PAYSTACK_PUBLIC_KEY = "pk_live_9e1705a04e21f148e758dc11c1e920ed6393702b";

const regions = [
  "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
  "Volta", "Northern", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Savannah", "North East", "Oti", "Western North",
];

const SELLER_PHONE = "+233 24 000 0000";

const getDeliveryEstimate = (buyerRegion: string) => {
  if (!buyerRegion) return null;
  if (buyerRegion === "Greater Accra") {
    return {
      standard: { label: "Local Delivery", range: "GHS 15–25", days: "1–2 business days" },
      express: { label: "Same-Day Delivery", range: "GHS 40–60", days: "Today (order before 12pm)" },
    };
  }
  const nearbyRegions = ["Central", "Eastern", "Volta", "Ashanti", "Western"];
  if (nearbyRegions.includes(buyerRegion)) {
    return {
      standard: { label: "Regional Delivery", range: "GHS 30–50", days: "2–4 business days" },
      express: { label: "Express Regional", range: "GHS 70–100", days: "Next day" },
    };
  }
  return {
    standard: { label: "Inter-Region Delivery", range: "GHS 60–120", days: "4–7 business days" },
    express: { label: "Express Inter-Region", range: "GHS 120–180", days: "2–3 business days" },
  };
};

function ensurePaystackScript(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).PaystackPop) { resolve(); return; }
    const existing = document.getElementById("paystack-script");
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const script = document.createElement("script");
    script.id = "paystack-script";
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const { listings } = usePublicListings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [delivery, setDelivery] = useState("standard");
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", address: "", city: "", region: "",
  });

  const sellerListing = listings.find((l) => l.sellerId === items[0]?.sneaker.sellerId);
  const isVerifiedSeller = sellerListing?.sellerVerified ?? false;

  useEffect(() => {
    if (isVerifiedSeller) ensurePaystackScript();
  }, [isVerifiedSeller]);

  const deliveryEstimate = getDeliveryEstimate(form.region);
  const orderTotal = totalPrice;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const buildDeliveryInfo = () => {
    if (delivery === "pickup") {
      return { label: "Pickup at Hub", estimatedCost: "Free", days: "Ready in 24hrs" };
    }
    const estimate = getDeliveryEstimate(form.region);
    const opt = estimate?.[delivery as "standard" | "express"];
    return {
      label: opt?.label ?? delivery,
      estimatedCost: opt?.range ?? "Contact seller",
      days: opt?.days ?? "",
    };
  };

  const submitOrder = async (paystackRef?: string) => {
    const deliveryInfo = buildDeliveryInfo();
    await placeOrder({
      sellerId: items[0]?.sneaker.sellerId ?? "",
      items: items.map((i) => ({
        id: i.sneaker.id,
        name: i.sneaker.name,
        brand: i.sneaker.brand,
        image: i.sneaker.image,
        price: i.sneaker.price,
        size: i.size,
        quantity: i.quantity,
      })),
      buyer: {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        address: form.address,
        city: form.city,
        region: form.region,
      },
      delivery,
      deliveryInfo,
      subtotal: totalPrice,
      deliveryFee: 0,
      total: orderTotal,
      ...(paystackRef ? {
        escrow_status: "held",
        paystack_reference: paystackRef,
      } : {}),
    });
    clearCart();
    setLoading(false);
    navigate("/order-confirmation");
  };

  const handlePlaceOrder = async () => {
    const { firstName, lastName, phone, address, city, region } = form;
    if (!firstName || !lastName || !phone || !address || !city || !region) {
      toast.error("Please fill in all delivery details");
      return;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setLoading(true);

    // ── Verified seller → Paystack escrow ──
    if (isVerifiedSeller) {
      try {
        await ensurePaystackScript();
      } catch {
        toast.error("Could not load payment SDK. Check your connection.");
        setLoading(false);
        return;
      }

      const PaystackPop = (window as any).PaystackPop;
      if (!PaystackPop) {
        toast.error("Payment SDK not available. Please refresh and try again.");
        setLoading(false);
        return;
      }

      const ref = `order_${Date.now()}`;

      const onPaymentSuccess = function(response: { reference: string }) {
        toast.success("Payment received — held in escrow until delivery!");
        submitOrder(response.reference);
      };

      let paymentAttempted = false;

      const onPaymentClose = function() {
        setLoading(false);
        if (!paymentAttempted) {
          // User closed without attempting payment
          toast("Payment cancelled.");
          return;
        }
        // Payment was attempted but popup closed — could be failed or insufficient funds
        toast.error(
          "Payment was not completed. This could be due to insufficient funds, a declined card, or a network issue. Please try again.",
          { duration: 6000 }
        );
      };

      const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: user?.email ?? form.phone + "@sneakershub.gh",
        amount: orderTotal * 100,
        currency: "GHS",
        ref: ref,
        channels: ["card", "mobile_money"],
        callback: onPaymentSuccess,
        onClose: onPaymentClose,
      });

      // Mark that user opened the payment iframe
      paymentAttempted = true;
      handler.openIframe();
      return;
    }

    // ── Unverified seller → pay on delivery ──
    await new Promise((res) => setTimeout(res, 1200));
    await submitOrder();
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 section-padding max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
          <ShoppingBag className="w-14 h-14 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-6">Nothing to checkout — your cart is empty.</p>
          <Link to="/shop">
            <Button className="btn-primary rounded-full px-8">Shop Now <ArrowRight className="ml-2 w-4 h-4" /></Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 section-padding max-w-5xl mx-auto pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Cart
          </Link>
          <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em] mb-1">Almost there</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">Checkout</h1>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">

          {/* ── Left: Form ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">

            {isVerifiedSeller ? (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-green-500/30 bg-green-500/5 p-4 flex items-start gap-3"
              >
                <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-display font-semibold text-green-700 dark:text-green-400 mb-1">
                    Verified Seller — Escrow Protected
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 leading-relaxed">
                    Your payment will be <span className="font-semibold">held securely by SneakersHub</span> and only released to the seller after you confirm receipt. You're fully protected.
                  </p>
                </div>
              </motion.div>
            ) : (
              <AnimatePresence>
                {!alertDismissed && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3"
                  >
                    <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-display font-semibold text-amber-700 dark:text-amber-400 mb-1">
                        Important Payment Notice
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-500 leading-relaxed">
                        <span className="font-semibold">Do not make any payment</span> until you have physically received and verified your order.
                        SneakersHub is a marketplace platform and will <span className="font-semibold">not be held liable</span> for any payments made before delivery is confirmed.
                      </p>
                    </div>
                    <button onClick={() => setAlertDismissed(true)}
                      className="text-amber-500 hover:text-amber-700 transition-colors flex-shrink-0 mt-0.5">
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Delivery info */}
            <div className="rounded-2xl border border-border p-6">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-5">
                Delivery Information
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: "firstName", label: "First Name", placeholder: "Dauda", icon: User },
                  { name: "lastName", label: "Last Name", placeholder: "Qarsim", icon: User },
                ].map(({ name, label, placeholder, icon: Icon }) => (
                  <div key={name}>
                    <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">{label}</label>
                    <div className="relative">
                      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input name={name} value={form[name as keyof typeof form]} onChange={handleChange} placeholder={placeholder}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                          placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
                    </div>
                  </div>
                ))}

                <div className="col-span-full">
                  <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="+233 24 000 0000"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                        placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
                  </div>
                </div>

                <div className="col-span-full">
                  <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">Street Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input name="address" value={form.address} onChange={handleChange} placeholder="House number, street name"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                        placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
                  </div>
                </div>

                <div>
                  <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">City / Town</label>
                  <input name="city" value={form.city} onChange={handleChange} placeholder="Accra"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                      placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
                </div>

                <div>
                  <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">Region</label>
                  <div className="relative">
                    <select name="region" value={form.region} onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                        focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit] appearance-none cursor-pointer">
                      <option value="">Select region</option>
                      {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery options */}
            <div className="rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Delivery Method
                </p>
                {form.region && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary" /> {form.region}
                  </span>
                )}
              </div>

              {!form.region && (
                <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-dashed border-border bg-muted/20">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">Select your region above to see delivery estimates.</p>
                </div>
              )}

              {form.region && deliveryEstimate && (
                <div className="space-y-2">
                  {(["standard", "express"] as const).map((type) => {
                    const opt = deliveryEstimate[type];
                    return (
                      <button key={type} onClick={() => setDelivery(type)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-200
                          ${delivery === type ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                            ${delivery === type ? "border-primary" : "border-muted-foreground/40"}`}>
                            {delivery === type && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <div>
                            <p className={`text-sm font-display font-semibold ${delivery === type ? "text-foreground" : "text-muted-foreground"}`}>
                              {opt.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{opt.days}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-display font-bold ${delivery === type ? "text-primary" : "text-muted-foreground"}`}>
                            {opt.range}
                          </p>
                          <p className="text-[10px] text-muted-foreground">estimated</p>
                        </div>
                      </button>
                    );
                  })}

                  <button onClick={() => setDelivery("pickup")}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-200
                      ${delivery === "pickup" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                        ${delivery === "pickup" ? "border-primary" : "border-muted-foreground/40"}`}>
                        {delivery === "pickup" && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div>
                        <p className={`text-sm font-display font-semibold ${delivery === "pickup" ? "text-foreground" : "text-muted-foreground"}`}>
                          Pickup at Hub
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Ready in 24hrs</p>
                      </div>
                    </div>
                    <p className={`text-sm font-display font-bold ${delivery === "pickup" ? "text-primary" : "text-muted-foreground"}`}>
                      Free
                    </p>
                  </button>
                </div>
              )}

              {form.region && (
                <div className="mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10">
                  <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Delivery fees are <span className="font-semibold text-foreground">estimates only</span> and may vary.
                    For exact pricing,{" "}
                    <a href={`tel:${SELLER_PHONE}`} className="text-primary font-semibold hover:opacity-70 transition-opacity">
                      contact the seller
                    </a>.
                  </p>
                </div>
              )}
            </div>

            {/* Payment method note */}
            <div className="rounded-2xl border border-border p-5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                {isVerifiedSeller ? <Lock className="w-4 h-4 text-primary" /> : <span className="text-sm">💳</span>}
              </div>
              <div>
                <p className="font-display text-sm font-semibold">
                  {isVerifiedSeller ? "Secure Escrow Payment" : "Payment on Delivery"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {isVerifiedSeller
                    ? "Pay now via card or Mobile Money. Your payment is held by SneakersHub and released to the seller only after you confirm receipt."
                    : "Pay with cash or Mobile Money (MTN MoMo / Telecel Cash) when your order arrives."
                  }
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Right: Order Summary ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border p-6 lg:sticky lg:top-28">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-5">Order Summary</p>

            <div className="space-y-3 mb-5">
              <AnimatePresence>
                {items.map((item) => (
                  <div key={`${item.sneaker.id}-${item.size}`} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 p-1.5">
                      <img src={item.sneaker.image} alt={item.sneaker.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.sneaker.name}</p>
                      <p className="text-xs text-muted-foreground">Size {item.size} · Qty {item.quantity}</p>
                    </div>
                    <p className="font-display font-bold text-sm flex-shrink-0">GHS {item.sneaker.price * item.quantity}</p>
                  </div>
                ))}
              </AnimatePresence>
            </div>

            {isVerifiedSeller && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/20">
                <ShieldCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                <p className="text-xs font-semibold text-green-600">Verified Seller · Escrow Protected</p>
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">GHS {totalPrice}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span className="font-medium">
                  {delivery === "pickup"
                    ? "Free"
                    : deliveryEstimate
                      ? <span className="text-xs">{deliveryEstimate[delivery as "standard" | "express"]?.range ?? "—"} <span className="text-muted-foreground">(est.)</span></span>
                      : <span className="text-muted-foreground text-xs">Select region</span>
                  }
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2.5 mt-2">
                <div>
                  <span className="font-display font-bold">Total</span>
                  <p className="text-[10px] text-muted-foreground">excl. delivery</p>
                </div>
                <span className="font-display font-bold text-lg">GHS {orderTotal}</span>
              </div>
            </div>

            {!isVerifiedSeller && (
              <div className="flex items-start gap-2 mt-5 mb-1 px-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-600 dark:text-amber-500 leading-relaxed">
                  Only pay after you've received and verified your order. SneakersHub is not liable for advance payments.
                </p>
              </div>
            )}

            <Button onClick={handlePlaceOrder} disabled={loading} className="btn-primary w-full h-12 rounded-full text-sm mt-3">
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                  {isVerifiedSeller ? "Opening payment..." : "Placing order..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isVerifiedSeller
                    ? <><CreditCard className="w-4 h-4" /> Pay GHS {orderTotal} — Escrow</>
                    : <><CheckCircle className="w-4 h-4" /> Place Order</>
                  }
                </span>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-3">
              {isVerifiedSeller
                ? "Secured by Paystack · Card & MoMo accepted"
                : "By placing your order you agree to our terms of service."
              }
            </p>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Checkout;