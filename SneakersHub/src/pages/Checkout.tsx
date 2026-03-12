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
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ?? "pk_live_9e1705a04e21f148e758dc11c1e920ed6393702b";

type SellerTier = "official" | "verified" | "standard";

const regions = [
  "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
  "Volta", "Northern", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Savannah", "North East", "Oti", "Western North",
];

// ── Region-based delivery pricing (instant, no external APIs) ──────────────
const getDeliveryFees = (buyerRegion: string, sellerRegion?: string | null) => {
  if (!buyerRegion) return { standard: 40, express: 80 };
  if (sellerRegion && buyerRegion === sellerRegion) return { standard: 20, express: 40 };
  const south = ["Greater Accra", "Central", "Eastern", "Volta", "Ashanti", "Western"];
  const north = ["Northern", "North East", "Savannah", "Upper East", "Upper West", "Oti", "Bono", "Bono East", "Ahafo", "Western North"];
  const nearbyZone =
    (south.includes(buyerRegion) && south.includes(sellerRegion ?? "")) ||
    (north.includes(buyerRegion) && north.includes(sellerRegion ?? ""));
  return nearbyZone ? { standard: 40, express: 80 } : { standard: 90, express: 150 };
};

function ensurePaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).PaystackPop) { resolve(); return; }
    const existing = document.getElementById("paystack-script");
    if (existing) {
      let attempts = 0;
      const poll = setInterval(() => {
        if ((window as any).PaystackPop) { clearInterval(poll); resolve(); return; }
        if (++attempts > 20) { clearInterval(poll); reject(new Error("Paystack SDK timeout")); }
      }, 200);
      return;
    }
    const script = document.createElement("script");
    script.id = "paystack-script";
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => {
      let attempts = 0;
      const poll = setInterval(() => {
        if ((window as any).PaystackPop) { clearInterval(poll); resolve(); return; }
        if (++attempts > 20) { clearInterval(poll); reject(new Error("Paystack SDK loaded but PaystackPop not found")); }
      }, 200);
    };
    script.onerror = () => reject(new Error("Failed to load Paystack script — check your ad blocker"));
    document.head.appendChild(script);
  });
}

// ── Delivery info builder for order ──────────────────────────────────────────
type DeliveryInfo = {
  method: string;
  address: string;
  city: string;
  region: string;
  phone: string;
  fee: number;
};

export default function Checkout() {
  const { items, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [delivery, setDelivery] = useState("standard");
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", address: "", city: "", region: "",
  });

  // Group cart items by seller
  const sellerGroups = groupBySeller(items);
  const totalPrice = items.reduce((sum, i) => sum + i.sneaker.price * i.quantity, 0);

  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [completedGroups, setCompletedGroups] = useState<string[]>([]);
  const currentGroup: SellerGroup | undefined = sellerGroups[currentGroupIndex];
  const tier = currentGroup?.tier ?? "standard";
  const requiresPayment = tier === "official" || tier === "verified";

  const sellerRegion = currentGroup?.sellerRegion ?? null;
  const sellerCity = currentGroup?.sellerCity ?? null;

  // Delivery fees — instant, region-based
  const deliveryFees = getDeliveryFees(form.region, sellerRegion);
  const currentDeliveryFee = delivery === "pickup" ? 0 : deliveryFees[delivery as "standard" | "express"];

  useEffect(() => {
    if (requiresPayment) ensurePaystackScript();
  }, [requiresPayment]);

  // Pre-fill form from user profile
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("name, phone, city, region").eq("id", user.id).single()
      .then(({ data }) => {
        if (!data) return;
        const [firstName = "", ...rest] = (data.name ?? "").split(" ");
        setForm(prev => ({
          ...prev,
          firstName,
          lastName: rest.join(" "),
          phone: data.phone ?? "",
          city: data.city ?? "",
          region: data.region ?? "",
        }));
      });
  }, [user?.id]);

  if (!items.length) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Your cart is empty</p>
          <Link to="/shop">
            <Button variant="outline">Continue Shopping</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const buildDeliveryInfo = (): DeliveryInfo => ({
    method: delivery,
    address: form.address,
    city: form.city,
    region: form.region,
    phone: form.phone,
    fee: currentDeliveryFee,
  });

  const submitGroupOrder = async (group: SellerGroup, paystackRef?: string) => {
    // ── Server-side price validation for paid orders ──────────────────────
    if (paystackRef) {
      try {
        const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${paystackRef}`, {
          headers: { Authorization: `Bearer ${PAYSTACK_PUBLIC_KEY}` },
        });
        const verifyData = await verifyRes.json();
        const paidAmount = verifyData.data?.amount ?? 0;
        const expectedAmount = Math.round((group.total + currentDeliveryFee) * 100);
        if (verifyData.data?.status !== "success") {
          throw new Error("Payment not confirmed by Paystack");
        }
        if (paidAmount < expectedAmount) {
          throw new Error(`Payment amount mismatch — expected GHS ${(expectedAmount / 100).toFixed(2)}, got GHS ${(paidAmount / 100).toFixed(2)}`);
        }
      } catch (err: any) {
        throw new Error(err.message ?? "Payment verification failed");
      }
    }

    const deliveryInfo = buildDeliveryInfo();
    await placeOrder({
      sellerId: group.sellerId,
      items: group.items.map((i) => ({
        sneakerId: i.sneaker.id,
        name: i.sneaker.name,
        brand: i.sneaker.brand,
        size: i.sneaker.size,
        price: i.sneaker.price,
        quantity: i.quantity,
        imageUrl: i.sneaker.imageUrl,
      })),
      subtotal: group.total,
      deliveryFee: currentDeliveryFee,
      total: group.total + currentDeliveryFee,
      deliveryMethod: deliveryInfo.method,
      deliveryAddress: `${deliveryInfo.address}, ${deliveryInfo.city}, ${deliveryInfo.region}`,
      buyerPhone: deliveryInfo.phone,
      buyerName: `${form.firstName} ${form.lastName}`.trim(),
      paystackReference: paystackRef,
      subaccountCode: group.sellerSubaccountCode,
    });
  };

  const advanceOrFinish = (group: SellerGroup) => {
    const newCompleted = [...completedGroups, group.sellerId];
    setCompletedGroups(newCompleted);
    if (currentGroupIndex + 1 < sellerGroups.length) {
      setCurrentGroupIndex((i) => i + 1);
      setLoading(false);
    } else {
      clearCart();
      navigate("/order-confirmation", {
        state: {
          buyerName: `${form.firstName} ${form.lastName}`.trim(),
          total: totalPrice,
          paystackReference: undefined,
        },
      });
    }
  };

  const handlePaystackPayment = async (group: SellerGroup) => {
    setLoading(true);
    try {
      await ensurePaystackScript();
      const PaystackPop = (window as any).PaystackPop;
      if (!PaystackPop) throw new Error("Payment SDK not available");

      const groupDeliveryFee = delivery === "pickup" ? 0 : deliveryFees[delivery as "standard" | "express"];
      const chargeTotal = group.total + groupDeliveryFee;

      let paymentCompleted = false;
      const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: user?.email,
        amount: Math.round(chargeTotal * 100),
        currency: "GHS",
        ref: `order_${Date.now()}_${user?.id?.slice(0, 6)}`,
        channels: ["card", "mobile_money"],
        subaccount: group.sellerSubaccountCode ?? undefined,
        bearer: group.sellerSubaccountCode ? "subaccount" : undefined,
        metadata: {
          custom_fields: [
            { display_name: "Seller", variable_name: "seller_id", value: group.sellerId },
            { display_name: "Delivery", variable_name: "delivery_method", value: delivery },
          ],
        },
        callback: (response: { reference: string }) => {
          paymentCompleted = true;
          toast.success(tier === "official" ? "Payment received — Official order placed!" : "Payment received");
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
      const msg = err?.message ?? String(err);
      if (msg.includes("ad blocker") || msg.includes("script")) {
        toast.error("Payment blocked — please disable your ad blocker and refresh.", { duration: 8000 });
      } else {
        toast.error(`Payment error: ${msg.slice(0, 80)}. Please refresh and try again.`, { duration: 8000 });
      }
      setLoading(false);
    }
  };

  const handlePayOnDelivery = async (group: SellerGroup) => {
    setLoading(true);
    try {
      await submitGroupOrder(group);
      advanceOrFinish(group);
    } catch (err: any) {
      toast.error(err.message ?? "Order failed. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!form.firstName || !form.phone || !form.region) {
      toast.error("Please fill in your name, phone, and region.");
      return;
    }
    if (!currentGroup) return;
    if (requiresPayment) {
      handlePaystackPayment(currentGroup);
    } else {
      handlePayOnDelivery(currentGroup);
    }
  };

  const tierLabel = (t: SellerTier) => {
    if (t === "official") return { label: "Official Store", icon: <Sparkles className="w-3 h-3" />, color: "text-purple-600" };
    if (t === "verified") return { label: "Verified Seller", icon: <BadgeCheck className="w-3 h-3" />, color: "text-green-600" };
    return { label: "Unverified Seller", icon: <ShieldAlert className="w-3 h-3" />, color: "text-muted-foreground" };
  };

  const tierInfo = tierLabel(tier);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 pb-24 pt-24" style={{ paddingTop: `calc(96px + env(safe-area-inset-top, 0px))` }}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/cart" className="p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold">Checkout</h1>
            {sellerGroups.length > 1 && (
              <p className="text-xs text-muted-foreground">
                Order {currentGroupIndex + 1} of {sellerGroups.length}
              </p>
            )}
          </div>
        </div>

        {/* Progress dots for multi-seller */}
        {sellerGroups.length > 1 && (
          <div className="flex gap-2 mb-6">
            {sellerGroups.map((g, i) => (
              <div key={g.sellerId}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  completedGroups.includes(g.sellerId) ? "bg-green-500"
                  : i === currentGroupIndex ? "bg-primary"
                  : "bg-muted"
                }`} />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={currentGroupIndex}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4">

            {/* Seller info */}
            <div className="rounded-2xl border border-border p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{currentGroup?.sellerName ?? "Seller"}</p>
                <p className={`text-xs flex items-center gap-1 ${tierInfo.color}`}>
                  {tierInfo.icon} {tierInfo.label}
                  {sellerCity && <span className="text-muted-foreground ml-1">· {sellerCity}{sellerRegion ? `, ${sellerRegion}` : ""}</span>}
                </p>
              </div>
              <span className="text-sm font-bold">GHS {currentGroup?.total ?? 0}</span>
            </div>

            {/* Order items */}
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
              {currentGroup?.items.map((item) => (
                <div key={`${item.sneaker.id}-${item.sneaker.size}`} className="flex items-center gap-3 p-4">
                  <img src={item.sneaker.imageUrl} alt={item.sneaker.name}
                    className="w-14 h-14 rounded-xl object-cover bg-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.sneaker.name}</p>
                    <p className="text-xs text-muted-foreground">Size {item.sneaker.size} · Qty {item.quantity}</p>
                  </div>
                  <span className="text-sm font-bold">GHS {item.sneaker.price * item.quantity}</span>
                </div>
              ))}
            </div>

            {/* Contact details */}
            <div className="rounded-2xl border border-border p-6 space-y-4">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Your Details</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "firstName", label: "First Name", icon: <User className="w-4 h-4" />, placeholder: "Kwame" },
                  { key: "lastName", label: "Last Name", icon: <User className="w-4 h-4" />, placeholder: "Mensah" },
                ].map(({ key, label, icon, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">{label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">{icon}</span>
                      <input
                        value={form[key as keyof typeof form]}
                        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="0244 000 000"
                    type="tel"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Delivery Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input
                    value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    placeholder="Street / Area / Landmark"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">City</label>
                  <input
                    value={form.city}
                    onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                    placeholder="Kumasi"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Region <span className="text-primary">*</span></label>
                  <div className="relative">
                    <select
                      value={form.region}
                      onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit] appearance-none pr-8"
                    >
                      <option value="">Select</option>
                      {regions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery options */}
            <div className="rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Delivery Method</p>
                {sellerCity && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary" />
                    Ships from {sellerCity}{sellerRegion ? `, ${sellerRegion}` : ""}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {(["standard", "express"] as const).map((type) => {
                  const fee = deliveryFees[type];
                  const label = type === "express" ? "Express Delivery" : "Standard Delivery";
                  const days = type === "express"
                    ? (sellerRegion && form.region === sellerRegion ? "Same day / Next day" : "Next day")
                    : (sellerRegion && form.region === sellerRegion ? "1–2 business days" : form.region && sellerRegion ? "2–5 business days" : "3–7 business days");
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
                          <p className={`text-sm font-display font-semibold ${delivery === type ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{days}</p>
                        </div>
                      </div>
                      <p className={`text-sm font-display font-bold ${delivery === type ? "text-primary" : "text-muted-foreground"}`}>
                        GHS {fee}
                      </p>
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
                      <p className="text-xs text-muted-foreground mt-0.5">Arrange pickup with seller directly</p>
                    </div>
                  </div>
                  <p className={`text-sm font-display font-bold text-green-500`}>Free</p>
                </button>
              </div>
            </div>

            {/* Payment method info */}
            <div className={`rounded-2xl border p-4 flex items-start gap-3 ${
              requiresPayment ? "border-primary/20 bg-primary/5" : "border-amber-500/20 bg-amber-500/5"
            }`}>
              {requiresPayment
                ? <Lock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                : <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className={`text-sm font-semibold ${requiresPayment ? "text-primary" : "text-amber-600"}`}>
                  {requiresPayment ? "Secure Payment" : "Pay on Delivery"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {requiresPayment
                    ? "Pay securely with card or MoMo. Funds held until your order is delivered."
                    : "This seller is unverified. Pay with cash or MoMo when your order arrives."
                  }
                </p>
              </div>
            </div>

            {/* Order summary */}
            <div className="rounded-2xl border border-border p-6">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">Order Summary</p>
              <div className="border-t border-border pt-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">GHS {currentGroup?.total ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-medium">
                    {delivery === "pickup"
                      ? <span className="text-green-500 font-semibold">Free</span>
                      : <span className="font-semibold text-foreground">GHS {currentDeliveryFee}</span>
                    }
                  </span>
                </div>
                {form.region && sellerRegion && delivery !== "pickup" && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{form.region === sellerRegion ? "Same region" : "Inter-region"}</span>
                    <span>{form.region}{form.region !== sellerRegion ? ` → ${sellerRegion}` : ""}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2.5 mt-2">
                  <span className="font-display font-bold">Total</span>
                  <div className="text-right">
                    <span className="font-display font-bold text-lg">
                      GHS {(currentGroup?.total ?? 0) + currentDeliveryFee}
                    </span>
                    {delivery !== "pickup" && (
                      <p className="text-[10px] text-muted-foreground">incl. GHS {currentDeliveryFee} delivery</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full h-14 rounded-2xl font-display font-bold text-base gap-2"
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
              ) : requiresPayment ? (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Pay GHS {(currentGroup?.total ?? 0) + currentDeliveryFee}
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  Place Order — Pay on Delivery
                </>
              )}
            </Button>

            {requiresPayment && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" />
                <span>Secured by Paystack · GHS {(currentGroup?.total ?? 0) + currentDeliveryFee} will be charged</span>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}