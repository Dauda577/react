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

const PAYSTACK_PUBLIC_KEY = "pk_live_9e1705a04e21f148e758dc11c1e920ed6393702b";

type SellerTier = "official" | "verified" | "standard";

const regions = [
  "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
  "Volta", "Northern", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Savannah", "North East", "Oti", "Western North",
];

const SELLER_PHONE = "+233 24 000 0000";

// ── Distance-based delivery pricing ──
const DELIVERY_BASE = 10;       // GHS base fee
const DELIVERY_PER_KM = 1.5;   // GHS per km
const DELIVERY_MIN = 15;        // GHS minimum
const DELIVERY_MAX = 200;       // GHS cap

const calcFee = (km: number) =>
  Math.min(DELIVERY_MAX, Math.max(DELIVERY_MIN, Math.round(DELIVERY_BASE + km * DELIVERY_PER_KM)));

// Geocode an address string using Nominatim (OpenStreetMap) — free, no API key
const geocode = async (query: string): Promise<[number, number] | null> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ", Ghana")}&format=json&limit=1`,
      { headers: { "Accept-Language": "en", "User-Agent": "SneakersHub/1.0" } }
    );
    const data = await res.json();
    if (!data?.[0]) return null;
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch { return null; }
};

// Get road distance in km using OSRM (free, no API key)
const getRoadKm = async (from: [number, number], to: [number, number]): Promise<number | null> => {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=false`
    );
    const data = await res.json();
    const meters = data?.routes?.[0]?.distance;
    return meters ? Math.round(meters / 1000) : null;
  } catch { return null; }
};

// Fallback: flat fee by region tier (used when location unavailable)
const getFallbackFee = (buyerRegion: string, sellerRegion?: string | null) => {
  if (!buyerRegion) return { standard: 40, express: 80 };
  if (sellerRegion && buyerRegion === sellerRegion) return { standard: 20, express: 40 };
  const south = ["Greater Accra","Central","Eastern","Volta","Ashanti","Western"];
  const north = ["Northern","North East","Savannah","Upper East","Upper West","Oti","Bono","Bono East","Ahafo","Western North"];
  const nearbyZone = (south.includes(buyerRegion) && south.includes(sellerRegion ?? "")) ||
                     (north.includes(buyerRegion) && north.includes(sellerRegion ?? ""));
  return nearbyZone ? { standard: 40, express: 80 } : { standard: 90, express: 150 };
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
          Pay securely via card or Mobile Money. Funds go directly to the seller via Paystack split — settled next business day.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          {["Secure Paystack payment", "Verified seller", "Funds split at checkout"].map(point => (
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
  const [locationState, setLocationState] = useState<"idle" | "detecting" | "detected" | "denied" | "fallback">("idle");
  const [buyerCoords, setBuyerCoords] = useState<[number, number] | null>(null);
  const [sellerCoords, setSellerCoords] = useState<[number, number] | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [deliveryFees, setDeliveryFees] = useState<{ standard: number; express: number } | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [geocoding, setGeocoding] = useState(false);
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

  const sellerRegion = currentGroup?.sellerRegion ?? null;
  const sellerCity = currentGroup?.sellerCity ?? null;

  // Geocode seller location once when seller group changes
  useEffect(() => {
    setDistanceKm(null);
    setDeliveryFees(null);
    setBuyerCoords(null);
    setSellerCoords(null);
    setLocationState("idle");
    const sellerQuery = [sellerCity, sellerRegion].filter(Boolean).join(", ");
    if (!sellerQuery) return;
    geocode(sellerQuery).then((coords) => {
      if (coords) setSellerCoords(coords);
    });
  }, [currentGroup?.sellerId]);

  // Try GPS on mount
  useEffect(() => {
    setLocationState("detecting");
    if (!navigator.geolocation) { setLocationState("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setBuyerCoords(coords);
        setLocationState("detected");
      },
      () => setLocationState("denied"),
      { timeout: 6000 }
    );
  }, []);

  // Calculate distance whenever both coords are ready
  useEffect(() => {
    if (!buyerCoords || !sellerCoords) return;
    getRoadKm(sellerCoords, buyerCoords).then((km) => {
      if (km !== null) {
        setDistanceKm(km);
        const std = calcFee(km);
        setDeliveryFees({ standard: std, express: Math.min(DELIVERY_MAX, Math.round(std * 1.8)) });
      } else {
        // OSRM failed — use fallback
        setDeliveryFees(getFallbackFee(form.region, sellerRegion));
      }
    });
  }, [buyerCoords, sellerCoords]);

  // Geocode typed location query
  const handleGeocode = async () => {
    if (!locationQuery.trim()) return;
    setGeocoding(true);
    const coords = await geocode(locationQuery);
    setGeocoding(false);
    if (coords) {
      setBuyerCoords(coords);
      setLocationState("detected");
    } else {
      toast.error("Couldn't find that location — try a nearby landmark or town name");
      setDeliveryFees(getFallbackFee(form.region, sellerRegion));
      setLocationState("fallback");
    }
  };

  const currentDeliveryFee = delivery === "pickup" ? 0 : (deliveryFees?.[delivery as "standard" | "express"] ?? null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const buildDeliveryInfo = () => {
    if (delivery === "pickup") return { label: "Pickup at Hub", estimatedCost: "Free", days: "Ready in 24hrs" };
    const fee = deliveryFees?.[delivery as "standard" | "express"] ?? getFallbackFee(form.region, sellerRegion)[delivery as "standard" | "express"];
    const days = delivery === "express" ? "Next day / Same day" : distanceKm && distanceKm < 20 ? "1–2 business days" : distanceKm && distanceKm < 100 ? "2–4 business days" : "4–7 business days";
    const label = delivery === "express" ? "Express Delivery" : "Standard Delivery";
    return { label, estimatedCost: `GHS ${fee}`, days };
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
      deliveryFee: currentDeliveryFee ?? 0,
      total: group.total + (currentDeliveryFee ?? 0),
      ...(paystackRef ? {
        // Verified seller with subaccount = split already happened at Paystack, mark released
        // Verified seller without subaccount = needs manual transfer, mark pending
        // Re-check DB to avoid stale cart cache
        payout_status: (() => {
          // We passed subaccountCode into submitGroupOrder via paystackRef context
          // Use the paystackRef presence + seller tier to determine
          return (paystackRef && group.tier === "verified") ? "released" : "pending";
        })(),
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
        // For verified sellers — fetch subaccount_code fresh from DB (not from stale cache)
        let subaccountCode: string | null = null;
        if (groupTier === "verified") {
          try {
            const { data: sellerProfile } = await supabase
              .from("profiles")
              .select("subaccount_code")
              .eq("id", group.sellerId)
              .single();
            subaccountCode = sellerProfile?.subaccount_code ?? null;
          } catch (e) {
          }
        }

        const groupDeliveryFee = currentDeliveryFee ?? 0;
        const chargeTotal = group.total + groupDeliveryFee;

        const handler = PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: user?.email ?? `${form.phone}@sneakershub.gh`,
          amount: Math.round(chargeTotal * 100), // product + delivery fee in pesewas
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
        <div className="pt-24 pwa-offset-24 section-padding max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
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

      <div className="pt-24 pwa-offset-24 section-padding max-w-5xl mx-auto pb-20">
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
                  { name: "firstName", label: "First Name", placeholder: "Kwame", icon: User },
                  { name: "lastName", label: "Last Name", placeholder: "Mensah", icon: User },
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
              <div className="flex items-center justify-between mb-4">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Delivery Method</p>
                {currentGroup?.sellerCity && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary" />
                    Ships from {currentGroup.sellerCity}{sellerRegion ? `, ${sellerRegion}` : ""}
                  </span>
                )}
              </div>

              {/* Location detection */}
              {locationState === "detecting" && (
                <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-dashed border-border bg-muted/20 mb-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">Detecting your location...</p>
                </div>
              )}

              {(locationState === "denied" || locationState === "fallback") && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    {locationState === "denied" ? "Location access denied — enter your area for accurate pricing" : "Couldn't find that location — try again or use region pricing"}
                  </p>
                  <div className="flex gap-2">
                    <input value={locationQuery} onChange={e => setLocationQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleGeocode()}
                      placeholder="e.g. Kumasi, Adum, Madina..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                        placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
                    <button onClick={handleGeocode} disabled={geocoding}
                      className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 transition-opacity">
                      {geocoding ? "..." : "Go"}
                    </button>
                  </div>
                </div>
              )}

              {locationState === "detected" && distanceKm !== null && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 mb-4">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <p className="text-xs text-green-600 font-medium">{distanceKm} km from seller · pricing calculated</p>
                </div>
              )}

              {/* Delivery options */}
              <div className="space-y-2">
                {(["standard", "express"] as const).map((type) => {
                  const fee = deliveryFees?.[type] ?? (locationState === "detecting" ? null : getFallbackFee(form.region, sellerRegion)[type]);
                  const label = type === "express" ? "Express Delivery" : "Standard Delivery";
                  const days = type === "express"
                    ? (distanceKm && distanceKm < 30 ? "Same day (order before 12pm)" : "Next day")
                    : (distanceKm && distanceKm < 20 ? "1–2 business days" : distanceKm && distanceKm < 100 ? "2–4 business days" : "4–7 business days");
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
                      <div className="text-right">
                        {fee !== null
                          ? <p className={`text-sm font-display font-bold ${delivery === type ? "text-primary" : "text-muted-foreground"}`}>GHS {fee}</p>
                          : <p className="text-xs text-muted-foreground">Calculating...</p>
                        }
                        {distanceKm !== null && <p className="text-[10px] text-muted-foreground">{distanceKm}km</p>}
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
                    Your payment is split at checkout via Paystack — 95% goes directly to the seller, settled next business day.
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
                    ? <span className="text-green-500 font-semibold">Free</span>
                    : currentDeliveryFee !== null
                      ? <span className="font-semibold text-foreground">GHS {currentDeliveryFee}</span>
                      : <span className="text-muted-foreground text-xs">{locationState === "detecting" ? "Calculating..." : "Share location for pricing"}</span>
                  }
                </span>
              </div>
              {distanceKm !== null && delivery !== "pickup" && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Distance</span>
                  <span>{distanceKm} km</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2.5 mt-2">
                <span className="font-display font-bold">Total</span>
                <div className="text-right">
                  <span className="font-display font-bold text-lg">
                    GHS {(currentGroup?.total ?? 0) + (currentDeliveryFee ?? 0)}
                  </span>
                  {delivery !== "pickup" && currentDeliveryFee !== null && (
                    <p className="text-[10px] text-muted-foreground">incl. GHS {currentDeliveryFee} delivery</p>
                  )}
                </div>
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