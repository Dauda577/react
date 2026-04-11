import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, MapPin, Phone, User, CheckCircle,
  ShoppingBag, ChevronDown, ArrowRight, ShieldAlert, X,
  ShieldCheck, CreditCard, Lock, Sparkles, BadgeCheck, Package,
  Store, Truck, MessageCircle, Clock, Ticket, Percent, Gift,
} from "lucide-react";
import { thumbImage } from "@/lib/imageutils";
import { useCart, groupBySeller, SellerGroup } from "@/context/CartContext";
import { useOrders } from "@/context/OrderContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckoutDeliveryOptions } from "@/components/CheckoutDeliveryOptions";

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ?? "pk_live_9e1705a04e21f148e758dc11c1e920ed6393702b";

type SellerTier = "official" | "verified" | "standard";

const regions = [
  "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
  "Volta", "Northern", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Savannah", "North East", "Oti", "Western North",
];

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
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery" | null>(null);
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", address: "", city: "", region: "",
  });
  const [orderNotes, setOrderNotes] = useState("");

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountPercent: number;
    sellerId: string | null;
    isReferralCode?: boolean;
  } | null>(null);

  // Group cart items by seller
  const sellerGroups = groupBySeller(items);
  const totalPrice = items.reduce((sum, i) => sum + i.listing.price * i.quantity, 0);

  const [freshShipping, setFreshShipping] = useState<Record<string, { shippingCost: number; handlingTime: string }>>({});

  useEffect(() => {
    const ids = items.map((i) => i.listing.id);
    if (ids.length === 0) return;
    supabase
      .from("listings")
      .select("id, shipping_cost, handling_time")
      .in("id", ids)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, { shippingCost: number; handlingTime: string }> = {};
        for (const row of data) {
          map[row.id] = {
            shippingCost: row.shipping_cost ?? 0,
            handlingTime: row.handling_time ?? "Ships in 1-3 days",
          };
        }
        setFreshShipping(map);
      });
  }, []);

  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [completedGroups, setCompletedGroups] = useState<string[]>([]);
  const currentGroup: SellerGroup | undefined = sellerGroups[currentGroupIndex];
  const tier = currentGroup?.tier ?? "standard";
  const requiresPayment = tier === "official" || tier === "verified";

  const sellerRegion = currentGroup?.sellerRegion ?? null;
  const sellerCity = currentGroup?.sellerCity ?? null;
  const isVerifiedSeller = tier === "verified" || tier === "official";
  const firstItemId = currentGroup?.items[0]?.listing.id ?? "";
  const freshData = freshShipping[firstItemId];
  const sellerShippingCost = isVerifiedSeller ? (freshData?.shippingCost ?? currentGroup?.shippingCost ?? 0) : 0;
  const sellerHandlingTime = isVerifiedSeller ? (freshData?.handlingTime ?? currentGroup?.handlingTime ?? "Ships in 1-3 days") : "";

  const currentDeliveryFee = 0;

  // Compute discounted total
  const groupTotal = currentGroup?.total ?? 0;
  const promoDiscount = appliedPromo ? Math.round(groupTotal * appliedPromo.discountPercent / 100) : 0;
  const finalTotal = groupTotal - promoDiscount;

  // Auto-apply referral reward if buyer has one unused
  useEffect(() => {
    if (!user?.id) return;
    if (appliedPromo) return;
    if (!currentGroup) return;
    if (currentGroup.tier !== "official") return;

    const autoApplyReferral = async () => {
      const { data: reward } = await supabase
        .from("referral_rewards")
        .select("promo_code, discount_pct")
        .eq("user_id", user.id)
        .eq("type", "discount")
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (reward) {
        setAppliedPromo({
          code: reward.promo_code,
          discountPercent: reward.discount_pct,
          sellerId: null,
          isReferralCode: true,
        });
      }
    };

    autoApplyReferral();
  }, [user?.id, currentGroup?.sellerId, currentGroup?.tier, items.length]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);

    const upperCode = promoCode.trim().toUpperCase();

    // ── 1. Check referral_rewards first ──────────────────────────────
    const { data: reward } = await supabase
      .from("referral_rewards")
      .select("id, promo_code, discount_pct, user_id, expires_at, used")
      .eq("promo_code", upperCode)
      .eq("used", false)
      .eq("user_id", user!.id)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (reward) {
      if (tier !== "official") {
        toast.error("Referral discounts can only be used on Official Products");
        setPromoLoading(false);
        return;
      }
      setAppliedPromo({
        code: reward.promo_code,
        discountPercent: reward.discount_pct,
        sellerId: null,
        isReferralCode: true,
      });
      toast.success(`Referral code applied — ${reward.discount_pct}% off!`);
      setPromoLoading(false);
      return;
    }

    // ── 2. Fall back to regular promo_codes ──────────────────────────
    const { data, error } = await supabase
      .from("promo_codes")
      .select("code, discount_percent, expires_at, max_uses, uses_count, seller_id")
      .eq("code", upperCode)
      .single();

    if (error || !data) {
      toast.error("Invalid promo code");
      setPromoLoading(false);
      return;
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast.error("This promo code has expired");
      setPromoLoading(false);
      return;
    }
    if (data.max_uses && data.uses_count >= data.max_uses) {
      toast.error("This promo code has reached its usage limit");
      setPromoLoading(false);
      return;
    }
    if (data.seller_id && data.seller_id !== currentGroup?.sellerId) {
      toast.error("This promo code is not valid for this seller");
      setPromoLoading(false);
      return;
    }

    setAppliedPromo({
      code: data.code,
      discountPercent: data.discount_percent,
      sellerId: data.seller_id ?? null,
      isReferralCode: false,
    });
    toast.success(`Promo applied — ${data.discount_percent}% off!`);
    setPromoLoading(false);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
    toast.info("Promo code removed");
  };

  // Reset promo when switching between seller groups if it's a referral code
  useEffect(() => {
    if (appliedPromo?.isReferralCode && tier !== "official") {
      setAppliedPromo(null);
      setPromoCode("");
      toast.warning("Referral code removed — only valid on Official Products");
    }
  }, [currentGroupIndex, tier]);

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
    method: deliveryMethod === "pickup" ? "pickup" : "delivery",
    address: form.address,
    city: form.city,
    region: form.region,
    phone: form.phone,
    fee: 0,
  });

  const submitGroupOrder = async (group: SellerGroup, paystackRef?: string) => {
    const deliveryInfo = buildDeliveryInfo();

    // Increment promo code usage if applied
    if (appliedPromo) {
      if (appliedPromo.isReferralCode) {
        // Mark referral reward as used
        await supabase
          .from("referral_rewards")
          .update({ used: true })
          .eq("promo_code", appliedPromo.code)
          .eq("user_id", user!.id);
      } else {
        await supabase.rpc("increment_promo_uses", { promo_code: appliedPromo.code });
      }
    }

    await placeOrder({
      sellerId: group.sellerId,
      items: group.items.map((i) => ({
        id: i.listing.id,
        sneakerId: i.listing.id,
        name: i.listing.name,
        brand: i.listing.brand,
        size: typeof i.size === "number" ? i.size : undefined,
        price: i.listing.price,
        quantity: i.quantity,
        imageUrl: i.listing.image,
        image: i.listing.image,
      })),
      subtotal: group.total,
      deliveryFee: 0,
      total: finalTotal,
      discountAmount: promoDiscount,
      promoCode: appliedPromo?.code,
      deliveryMethod: deliveryInfo.method,
      deliveryAddress: `${deliveryInfo.address}, ${deliveryInfo.city}, ${deliveryInfo.region}`,
      buyerPhone: deliveryInfo.phone,
      buyerName: `${form.firstName} ${form.lastName}`.trim(),
      paystackReference: paystackRef,
      subaccountCode: group.sellerSubaccountCode,
      deliveryStatus: deliveryInfo.method === "pickup" ? "ready_for_pickup" : "pending",
      orderNotes: orderNotes,
    });
  };

  const handlePaystackPayment = async (group: SellerGroup) => {
    setLoading(true);
    try {
      await ensurePaystackScript();
      const PaystackPop = (window as any).PaystackPop;
      if (!PaystackPop) throw new Error("Payment SDK not available");

      const chargeTotal = finalTotal;

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
            { display_name: "Delivery Method", variable_name: "delivery_method", value: deliveryMethod === "pickup" ? "pickup" : "delivery" },
            { display_name: "Promo Code", variable_name: "promo_code", value: appliedPromo?.code ?? "" },
            { display_name: "Discount Amount", variable_name: "discount_amount", value: promoDiscount.toString() },
          ],
        },
        callback: (response: { reference: string }) => {
          paymentCompleted = true;
          toast.success(tier === "official" ? "Payment received — Official order placed!" : "Payment received");

          submitGroupOrder(group, response.reference)
            .then(() => {
              const newCompleted = [...completedGroups, group.sellerId];
              setCompletedGroups(newCompleted);

              if (currentGroupIndex + 1 < sellerGroups.length) {
                setCurrentGroupIndex((i) => i + 1);
                setAppliedPromo(null)
                setLoading(false);
              } else {
                clearCart();
                navigate(`/order-confirmation?reference=${response.reference}&method=${deliveryMethod}`);
              }
            })
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
      const newCompleted = [...completedGroups, group.sellerId];
      setCompletedGroups(newCompleted);

      if (currentGroupIndex + 1 < sellerGroups.length) {
        setCurrentGroupIndex((i) => i + 1);
        setAppliedPromo(null)
        setLoading(false);
      } else {
        clearCart();
        navigate(`/order-confirmation?method=${deliveryMethod}`);
      }
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
    if (!deliveryMethod) {
      toast.error("Please select a delivery method (Pickup or Delivery).");
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

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 pb-24 pt-24"
        style={{ paddingTop: `calc(96px + env(safe-area-inset-top, 0px))` }}>

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
                className={`h-1.5 flex-1 rounded-full transition-colors ${completedGroups.includes(g.sellerId) ? "bg-green-500"
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
                  {sellerCity && (
                    <span className="text-muted-foreground ml-1">
                      · {sellerCity}{sellerRegion ? `, ${sellerRegion}` : ""}
                    </span>
                  )}
                </p>
              </div>
              <span className="text-sm font-bold">GHS {groupTotal}</span>
            </div>

            {/* Order items */}
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
              {currentGroup?.items.map((item) => (
                <div key={`${item.listing.id}-${item.size}`} className="flex items-center gap-3 p-4">
                  <img src={thumbImage(item.listing.image)} alt={item.listing.name}
                    className="w-14 h-14 rounded-xl object-cover bg-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.listing.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.size !== "one-size" ? `Size ${item.size} · ` : ""}Qty {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-bold">GHS {item.listing.price * item.quantity}</span>
                </div>
              ))}
            </div>

            {/* Promo Code Section */}
            <div className="rounded-2xl border border-border p-6">
              <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
                <Ticket className="w-4 h-4" /> Promo Code
              </h3>

              {/* Auto-applied referral banner */}
              {appliedPromo?.isReferralCode && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 mb-3">
                  <Gift className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-green-700">Referral discount auto-applied 🎉</p>
                    <p className="text-[11px] text-green-600/80">
                      {appliedPromo.discountPercent}% off · Code: <span className="font-mono font-bold">{appliedPromo.code}</span>
                    </p>
                  </div>
                  <button onClick={handleRemovePromo} className="p-1 rounded-lg hover:bg-green-500/20 transition-colors">
                    <X className="w-3.5 h-3.5 text-green-600" />
                  </button>
                </div>
              )}

              {appliedPromo && !appliedPromo.isReferralCode ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                  <div>
                    <p className="text-sm font-semibold text-green-600">{appliedPromo.code}</p>
                    <p className="text-xs text-green-600/70">
                      {appliedPromo.discountPercent}% discount applied
                    </p>
                  </div>
                  <button
                    onClick={handleRemovePromo}
                    className="p-1.5 rounded-lg hover:bg-green-500/20 transition-colors"
                  >
                    <X className="w-4 h-4 text-green-600" />
                  </button>
                </div>
              ) : !appliedPromo ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Enter promo code"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm
                        placeholder:text-muted-foreground focus:outline-none focus:border-primary
                        focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <Button
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoCode.trim()}
                    variant="outline"
                    className="rounded-xl"
                  >
                    {promoLoading ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
              ) : null}
              {tier !== "official" && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  💡 Referral codes only work with Official Products
                </p>
              )}
            </div>

            {/* Delivery Options */}
            <div className="rounded-2xl border border-border p-6">
              <CheckoutDeliveryOptions
                onDeliveryMethodChange={setDeliveryMethod}
                selectedMethod={deliveryMethod}
                sellerCity={sellerCity}
                sellerRegion={sellerRegion}
                sellerName={currentGroup?.sellerName}
              />
            </div>

            {/* Order Notes */}
            <div className="rounded-2xl border border-border p-6">
              <h3 className="font-display text-sm font-semibold mb-3">Order Notes (Optional)</h3>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Special instructions, delivery preferences, etc."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm
                  placeholder:text-muted-foreground focus:outline-none focus:border-primary
                  focus:ring-1 focus:ring-primary/20 transition-all resize-none"
              />
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
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                          placeholder:text-muted-foreground focus:outline-none focus:border-primary
                          focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]"
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                      placeholder:text-muted-foreground focus:outline-none focus:border-primary
                      focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]"
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                      placeholder:text-muted-foreground focus:outline-none focus:border-primary
                      focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]"
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
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                      placeholder:text-muted-foreground focus:outline-none focus:border-primary
                      focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">
                    Region <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.region}
                      onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                        focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                        transition-all font-[inherit] appearance-none pr-8"
                    >
                      <option value="">Select</option>
                      {regions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment method info */}
            <div className={`rounded-2xl border p-4 flex items-start gap-3 ${requiresPayment ? "border-primary/20 bg-primary/5" : "border-amber-500/20 bg-amber-500/5"
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
                    ? "Pay securely with card or MoMo. Delivery fee will be arranged after order."
                    : "This seller is unverified. Pay with cash or MoMo when your order arrives."
                  }
                </p>
              </div>
            </div>

            {/* Order summary */}
            <div className="rounded-2xl border border-border p-6">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
                Order Summary
              </p>
              <div className="border-t border-border pt-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">GHS {groupTotal}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({appliedPromo.discountPercent}% off)</span>
                    <span>- GHS {promoDiscount}</span>
                  </div>
                )}
                {deliveryMethod === "pickup" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pickup</span>
                    <span className="font-medium text-green-500">Free</span>
                  </div>
                )}
                {deliveryMethod === "delivery" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span className="font-medium text-amber-600">To be confirmed</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2.5 mt-2">
                  <span className="font-display font-bold">Total to pay now</span>
                  <div className="text-right">
                    <span className="font-display font-bold text-lg">
                      GHS {finalTotal}
                    </span>
                    {deliveryMethod === "delivery" && (
                      <p className="text-[10px] text-muted-foreground">+ delivery fee after order</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={loading || !deliveryMethod}
              className="w-full h-14 rounded-2xl font-display font-bold text-base gap-2"
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
              ) : requiresPayment ? (
                <><ShieldCheck className="w-5 h-5" /> Pay GHS {finalTotal}</>
              ) : (
                <><ArrowRight className="w-5 h-5" /> Place Order — Pay on Delivery</>
              )}
            </Button>

            {requiresPayment && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" />
                <span>Secured by Paystack · GHS {finalTotal} will be charged</span>
              </div>
            )}

            {deliveryMethod === "delivery" && requiresPayment && (
              <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                <p className="text-xs text-blue-600">
                  📦 After payment, we'll contact you to confirm delivery details and fee
                </p>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}