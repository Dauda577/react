import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, MapPin, Phone, User, CheckCircle,
  ShoppingBag, ChevronDown, ArrowRight, ShieldAlert, X,
  ShieldCheck, CreditCard, Lock, Sparkles, BadgeCheck, Package,
} from "lucide-react";
import { useCart, groupBySeller, SellerGroup } from "@/context/CartContext";
import { useOrders } from "@/context/OrderContext";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PAYSTACK_PUBLIC_KEY = "pk_live_9e1705a04e21f148e758dc11c1e920ed6393702b";

type SellerTier = "official" | "verified" | "standard";

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
  return new Promise((resolve, reject) => {
    // Already loaded
    if ((window as any).PaystackPop) { resolve(); return; }

    // Script tag exists — poll until PaystackPop is ready
    const existing = document.getElementById("paystack-script");
    if (existing) {
      let attempts = 0;
      const poll = setInterval(() => {
        if ((window as any).PaystackPop) { clearInterval(poll); resolve(); return; }
        if (++attempts > 20) { clearInterval(poll); reject(new Error("Paystack SDK timeout")); }
      }, 200);
      return;
    }

    // Inject script
    const script = document.createElement("script");
    script.id = "paystack-script";
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => {
      // Poll until PaystackPop is actually available on window
      let attempts = 0;
      const poll = setInterval(() => {
        if ((window as any).PaystackPop) { clearInterval(poll); resolve(); return; }
        if (++attempts > 20) { clearInterval(poll); reject(new Error("Paystack SDK loaded but PaystackPop not found")); }
      }, 100);
    };
    script.onerror = () => reject(new Error("Failed to load Paystack script — check network or ad blocker"));
    document.head.appendChild(script);
  });
}

// ── Tier-specific payment notice ─────────────────────────────────────────────
const TierBanner = ({ tier }: { tier: SellerTier }) => {
  if (tier === "official") return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 flex items-start gap-3"
      style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.08), rgba(30,27,75,0.12))", border: "1px solid rgba(109,40,217,0.3)" }}>
      <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#a78bfa" }} />
      <div className="space-y-1.5">
        <p className="text-sm font-bold" style={{ color: "#a78bfa" }}>SneakersHub Official</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Pay now via card or Mobile Money. Official store — your order is handled directly by SneakersHub.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          {["Secure Paystack payment", "Verified official store", "Fast dispatch guaranteed"].map(point => (
            <span key={point} className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "#a78bfa" }}>
              <CheckCircle className="w-3 h-3 flex-shrink-0" /> {point}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );

  if (tier === "verified") return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-green-500/30 bg-green-500/5 p-4 flex items-start gap-3">
      <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
      <div className="space-y-1.5">
        <p className="text-sm font-display font-semibold text-green-700 dark:text-green-400">Verified Seller — Secure Payment</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Pay securely via card or Mobile Money. Funds transfer to the seller when they dispatch your order.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          {["Secure Paystack payment", "Verified seller", "Instant transfer on dispatch"].map(point => (
            <span key={point} className="flex items-center gap-1 text-[11px] font-medium text-green-600">
              <CheckCircle className="w-3 h-3 flex-shrink-0" /> {point}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );

  // Standard seller — pay on delivery
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-muted/30 p-4 flex items-start gap-3">
      <Package className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="space-y-1.5">
        <p className="text-sm font-display font-semibold text-foreground">Pay on Delivery</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This seller is not yet verified. No payment is collected now — arrange payment directly with the seller when your order arrives.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          {["No payment taken today", "Pay cash or MoMo on delivery", "Inspect before you pay"].map(point => (
            <span key={point} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <CheckCircle className="w-3 h-3 flex-shrink-0 text-primary" /> {point}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const Checkout = () => {
  const { items, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [delivery, setDelivery] = useState("standard");
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", address: "", city: "", region: "",
  });

  // Group cart items by seller — this is the core of multi-seller checkout
  const sellerGroups = groupBySeller(items);
  const totalPrice = items.reduce((sum, i) => sum + i.sneaker.price * i.quantity, 0);

  // Track which seller group we're currently checking out
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [completedGroups, setCompletedGroups] = useState<string[]>([]); // sellerIds done
  const currentGroup: SellerGroup | undefined = sellerGroups[currentGroupIndex];
  const tier = currentGroup?.tier ?? "standard";
  const requiresPayment = tier === "official" || tier === "verified";

  useEffect(() => {
    if (requiresPayment) ensurePaystackScript();
  }, [requiresPayment]);

  const deliveryEstimate = getDeliveryEstimate(form.region);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const buildDeliveryInfo = () => {
    if (delivery === "pickup") return { label: "Pickup at Hub", estimatedCost: "Free", days: "Ready in 24hrs" };
    const estimate = getDeliveryEstimate(form.region);
    const opt = estimate?.[delivery as "standard" | "express"];
    return { label: opt?.label ?? delivery, estimatedCost: opt?.range ?? "Contact seller", days: opt?.days ?? "" };
  };

  const submitGroupOrder = async (group: SellerGroup, paystackRef?: string) => {
    const deliveryInfo = buildDeliveryInfo();
    await placeOrder({
      sellerId: group.sellerId,
      items: group.items.map((i) => ({
        id: i.sneaker.id, name: i.sneaker.name, brand: i.sneaker.brand,
        image: i.sneaker.image, price: i.sneaker.price, size: i.size, quantity: i.quantity,
      })),
      buyer: { firstName: form.firstName, lastName: form.lastName, phone: form.phone, address: form.address, city: form.city, region: form.region },
      delivery,
      deliveryInfo,
      subtotal: group.total,
      deliveryFee: 0,
      total: group.total,
      ...(paystackRef ? {
        // Verified seller with subaccount = split already happened, mark released
        // Verified seller without subaccount = needs manual transfer, mark pending
        payout_status: group.sellerSubaccountCode ? "released" : "pending",
        paystack_reference: paystackRef,
      } : {}),
    });
  };

  const advanceOrFinish = async (group: SellerGroup) => {
    const newCompleted = [...completedGroups, group.sellerId];
    setCompletedGroups(newCompleted);

    if (newCompleted.length === sellerGroups.length) {
      // All groups done
      clearCart();
      setLoading(false);
      navigate("/order-confirmation");
    } else {
      // Move to next group
      setCurrentGroupIndex((i) => i + 1);
      setLoading(false);
      toast.success(`Order ${newCompleted.length} of ${sellerGroups.length} placed! Continue with next seller.`);
    }
  };

  const handlePlaceOrder = async () => {
    const { firstName, lastName, phone, address, city, region } = form;
    if (!firstName || !lastName || !phone || !address || !city || !region) {
      toast.error("Please fill in all delivery details");
      return;
    }
    if (!currentGroup) return;

    setLoading(true);

    if (requiresPayment) {
      // Ensure script is loaded
      try {
        await ensurePaystackScript();
      } catch {
        toast.error("Could not load payment. Disable any ad blocker and try again.", { duration: 6000 });
        setLoading(false);
        return;
      }

      const PaystackPop = (window as any).PaystackPop;
      if (!PaystackPop) {
        toast.error("Payment SDK not available. Please refresh and try again.");
        setLoading(false);
        return;
      }

      // Snapshot group at time of click — avoid stale closure issues
      const group = currentGroup;
      const groupTier = tier;
      const ref = `order_${Date.now()}_${group.sellerId.slice(0, 6)}`;
      let paymentCompleted = false;

      try {
        // For verified sellers with a subaccount, split payment at source
        const subaccountCode = groupTier === "verified" ? group.sellerSubaccountCode : null;

        const handler = PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: user?.email ?? `${form.phone}@sneakershub.gh`,
          amount: Math.round(group.total * 100), // Paystack expects pesewas (int)
          currency: "GHS",
          ref,
          channels: ["card", "mobile_money"],
          ...(subaccountCode ? {
            subaccount: subaccountCode,
            bearer: "account",         // platform bears the Paystack fee
            transaction_charge: 0,     // 0 = use split_percentage instead
          } : {}),
          metadata: {
            custom_fields: [
              { display_name: "Seller", variable_name: "seller_name", value: group.sellerName },
              { display_name: "Type", variable_name: "seller_tier", value: groupTier },
              ...(subaccountCode ? [{ display_name: "Subaccount", variable_name: "subaccount_code", value: subaccountCode }] : []),
            ]
          },
          callback: (response: { reference: string }) => {
            paymentCompleted = true;
            toast.success(groupTier === "official"
              ? "Payment received — Official order placed!"
              : "Payment received"
            );
            // Run async work outside the callback
            submitGroupOrder(group, response.reference)
              .then(() => advanceOrFinish(group))
              .catch((err) => {
                console.error("Order placement failed after payment:", err);
                toast.error("Payment received but order failed to save. Contact support with ref: " + response.reference);
                setLoading(false);
              });
          },
          onClose: () => {
            if (!paymentCompleted) {
              setLoading(false);
              toast("Payment cancelled.");
            }
          },
        });

        handler.openIframe();
      } catch (err: any) {
        console.error("Paystack error:", err?.message ?? err);
        const msg = err?.message ?? String(err);
        if (msg.includes("ad blocker") || msg.includes("script")) {
          toast.error("Payment blocked — please disable your ad blocker and refresh.", { duration: 8000 });
        } else {
          toast.error(`Payment error: ${msg.slice(0, 80)}. Please refresh and try again.`, { duration: 8000 });
        }
        setLoading(false);
      }
      return;
    }

    // Standard seller — pay on delivery
    await new Promise((res) => setTimeout(res, 800));
    await submitGroupOrder(currentGroup);
    await advanceOrFinish(currentGroup);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 section-padding max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
          <ShoppingBag className="w-14 h-14 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-6">Nothing to checkout — your cart is empty.</p>
          <Link to="/shop"><Button className="btn-primary rounded-full px-8">Shop Now <ArrowRight className="ml-2 w-4 h-4" /></Button></Link>
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

          {/* Multi-seller progress indicator */}
          {sellerGroups.length > 1 && (
            <div className="mt-6 p-4 rounded-2xl border border-border bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground mb-3">
                Your cart has items from {sellerGroups.length} sellers — you'll complete {sellerGroups.length} separate orders
              </p>
              <div className="flex gap-2 flex-wrap">
                {sellerGroups.map((group, i) => {
                  const done = completedGroups.includes(group.sellerId);
                  const active = i === currentGroupIndex;
                  return (
                    <div key={group.sellerId}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        done ? "bg-green-500/10 border-green-500/30 text-green-600"
                        : active ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted/40 border-border text-muted-foreground"
                      }`}>
                      {done
                        ? <CheckCircle className="w-3 h-3 flex-shrink-0" />
                        : active
                          ? <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
                          : <div className="w-3 h-3 rounded-full border-2 border-border flex-shrink-0" />
                      }
                      <span>{i + 1}. {group.sellerName}</span>
                      <span className="opacity-60">
                        {group.tier === "official" ? "· Official" : group.tier === "verified" ? "· Verified" : "· Pay on delivery"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">

          {/* ── Left: Form ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">

            <TierBanner tier={tier} />

            {/* Delivery info */}
            <div className="rounded-2xl border border-border p-6">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-5">Delivery Information</p>
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
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Delivery Method</p>
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
                            <p className={`text-sm font-display font-semibold ${delivery === type ? "text-foreground" : "text-muted-foreground"}`}>{opt.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{opt.days}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-display font-bold ${delivery === type ? "text-primary" : "text-muted-foreground"}`}>{opt.range}</p>
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
                        <p className={`text-sm font-display font-semibold ${delivery === "pickup" ? "text-foreground" : "text-muted-foreground"}`}>Pickup at Hub</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Ready in 24hrs</p>
                      </div>
                    </div>
                    <p className={`text-sm font-display font-bold ${delivery === "pickup" ? "text-primary" : "text-muted-foreground"}`}>Free</p>
                  </button>
                </div>
              )}

              {form.region && (
                <div className="mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10">
                  <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Delivery fees are <span className="font-semibold text-foreground">estimates only</span>.
                    For exact pricing,{" "}
                    <a href={`tel:${SELLER_PHONE}`} className="text-primary font-semibold hover:opacity-70 transition-opacity">contact the seller</a>.
                  </p>
                </div>
              )}
            </div>

            {/* Payment method note — rebuilt per tier */}
            {(tier === "official" || tier === "verified") && (
              <div className="rounded-2xl border border-border p-5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={tier === "official" ? { background: "rgba(109,40,217,0.15)" } : { background: "rgba(34,197,94,0.1)" }}>
                  {tier === "official"
                    ? <Sparkles className="w-4 h-4" style={{ color: "#a78bfa" }} />
                    : <Lock className="w-4 h-4 text-green-500" />}
                </div>
                <div>
                  <p className="font-display text-sm font-semibold">
                    {tier === "official" ? "Pay now — Official Store" : "Pay now — Secure Payment"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Your payment is collected now via card or Mobile Money and transferred to the seller once they dispatch your order.
                  </p>
                </div>
              </div>
            )}
            {tier === "standard" && (
              <div className="rounded-2xl border border-border bg-muted/20 p-5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold">No payment collected today</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Place your order now to notify the seller. Pay cash or Mobile Money (MTN MoMo / Telecel Cash) directly when your order is delivered and inspected.
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* ── Right: Order Summary ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border p-6 lg:sticky lg:top-28"
            style={tier === "official" ? { borderColor: "rgba(109,40,217,0.25)" } : {}}>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-5">Order Summary</p>

            {/* Seller label for current group */}
            {currentGroup && (
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  tier === "official" ? "bg-purple-500"
                  : tier === "verified" ? "bg-green-500"
                  : "bg-muted-foreground"
                }`} />
                <p className="text-xs font-semibold text-muted-foreground">
                  {currentGroup.sellerName}
                  {sellerGroups.length > 1 && <span className="opacity-60"> · Order {currentGroupIndex + 1} of {sellerGroups.length}</span>}
                </p>
              </div>
            )}

            <div className="space-y-3 mb-5">
              {(currentGroup?.items ?? []).map((item) => (
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
            </div>

            {/* Tier badge in summary */}
            {tier === "official" && (
              <div className="flex items-center gap-1.5 mb-4 px-3 py-2 rounded-xl"
                style={{ background: "rgba(109,40,217,0.08)", border: "1px solid rgba(109,40,217,0.2)" }}>
                <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: "#a78bfa" }} />
                <p className="text-[11px] font-bold" style={{ color: "#a78bfa" }}>Official Product · Secure Paystack Payment</p>
              </div>
            )}
            {tier === "verified" && (
              <div className="flex items-center gap-1.5 mb-4 px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/20">
                <ShieldCheck className="w-3 h-3 text-green-500 flex-shrink-0" />
                <p className="text-[11px] font-semibold text-green-600">Verified Seller · Secure Paystack Payment</p>
              </div>
            )}
            {tier === "standard" && (
              <div className="flex items-center gap-1.5 mb-4 px-3 py-2 rounded-xl bg-muted/40 border border-border">
                <Package className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <p className="text-[11px] font-semibold text-muted-foreground">Unverified Seller · Pay on delivery only</p>
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">GHS {currentGroup?.total ?? 0}</span>
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
                <span className="font-display font-bold text-lg">GHS {currentGroup?.total ?? 0}</span>
              </div>
            </div>



            <Button onClick={handlePlaceOrder} disabled={loading} className="btn-primary w-full h-12 rounded-full text-sm mt-3"
              style={tier === "official" ? { background: "linear-gradient(135deg, #6d28d9, #4c1d95)" } : {}}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                  {requiresPayment ? "Opening payment..." : "Placing order..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {tier === "official"
                    ? <><Sparkles className="w-4 h-4" /> Pay GHS {currentGroup?.total ?? 0}</>
                    : tier === "verified"
                      ? <><Lock className="w-4 h-4" /> Pay GHS {currentGroup?.total ?? 0} Securely</>
                      : <><Package className="w-4 h-4" /> Place Order — Pay on Delivery</>
                  }
                </span>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-3">
              {tier === "official" || tier === "verified"
                ? "Payment secured by Paystack · Card & Mobile Money accepted"
                : "No payment now — pay cash or MoMo when your order arrives"}
            </p>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Checkout;