import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle, MapPin, Phone, Package, ArrowRight, ShoppingBag,
  AlertTriangle, Truck, Store, MessageCircle, Clock,
} from "lucide-react";
import { useOrders } from "@/context/OrderContext";
import { TrackingDisplay } from "@/components/TrackingDisplay";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const statusSteps = ["Order Placed", "Confirmed", "Driver Assigned", "Delivered"];

const OrderConfirmation = () => {
  const { latestOrder, refreshOrders } = useOrders();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualOrder, setManualOrder] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<{ city?: string; region?: string; name?: string } | null>(null);

  const reference = searchParams.get('reference');
  const trxRef = searchParams.get('trxref');
  const deliveryMethod = searchParams.get('method');

  // Fetch order by reference if latestOrder not yet available
  useEffect(() => {
    const fetchOrderByReference = async () => {
      const ref = reference || trxRef;
      if (!ref || latestOrder) return;

      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: orders, error } = await supabase
          .from("orders")
          .select(`*, order_items (*)`)
          .eq("paystack_reference", ref)
          .eq("buyer_id", user.id)
          .order("placed_at", { ascending: false })
          .limit(1);

        if (error) throw error;

        if (orders && orders.length > 0) {
          const order = orders[0];
          setManualOrder({
            id: order.id,
            sellerId: order.seller_id,
            items: order.order_items.map((item: any) => ({
              id: item.listing_id,
              name: item.name,
              brand: item.brand,
              price: item.price,
              size: item.size,
              quantity: item.quantity,
              image: item.image,
            })),
            buyer: {
              firstName: order.buyer_first_name,
              lastName: order.buyer_last_name,
              phone: order.buyer_phone,
              address: order.buyer_address,
              city: order.buyer_city,
              region: order.buyer_region,
            },
            delivery: order.delivery_method,
            deliveryStatus: order.delivery_status,
            total: order.total_amount,
            deliveryFee: order.delivery_fee,
            subtotal: order.subtotal,
            placedAt: order.placed_at,
            paystackReference: order.paystack_reference,
            status: order.status,
            sellerConfirmed: order.seller_confirmed,
            buyerConfirmed: order.buyer_confirmed,
            trackingNumber: order.tracking_number,
            trackingUrl: order.tracking_url,
            orderNotes: order.order_notes,
          });
        } else {
          setError("Your payment was successful but we're having trouble loading your order. Please check your Orders page in a few minutes.");
        }
      } catch (err) {
        console.error("Error fetching order:", err);
        setError("Something went wrong loading your order. Please check your Orders page.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderByReference();
  }, [reference, trxRef, latestOrder]);

  // Refresh orders periodically until we have one
  useEffect(() => {
    if (!latestOrder && !manualOrder) {
      const interval = setInterval(() => { refreshOrders(); }, 3000);
      return () => clearInterval(interval);
    }
  }, [latestOrder, manualOrder, refreshOrders]);

  const order = latestOrder || manualOrder;

  // ── Fetch seller profile for dynamic pickup location ──────────────────────
  useEffect(() => {
    const sellerId = order?.sellerId ?? order?.seller_id;
    if (!sellerId) return;
    supabase
      .from("profiles")
      .select("name, city, region")
      .eq("id", sellerId)
      .single()
      .then(({ data }) => {
        if (data) setSellerProfile(data);
      });
  }, [order?.sellerId, order?.seller_id]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 section-padding max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-14 h-14 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading your order...</p>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 section-padding max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Payment Received</h1>
          <p className="text-muted-foreground text-sm max-w-md text-center mb-6">{error}</p>
          <div className="flex gap-3">
            <Link to="/account?tab=orders">
              <Button className="btn-primary rounded-full px-6">
                View My Orders <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link to="/shop">
              <Button variant="outline" className="rounded-full px-6">Continue Shopping</Button>
            </Link>
          </div>
          {reference && (
            <p className="text-xs text-muted-foreground mt-4 font-mono">Reference: {reference}</p>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  // ── No order state ────────────────────────────────────────────────────────
  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div
          className="pt-24 section-padding max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]"
          style={{ paddingTop: `calc(96px + env(safe-area-inset-top, 0px))` }}
        >
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

  const {
    id, items, buyer, delivery, deliveryStatus, total,
    deliveryFee, subtotal, placedAt, paystackReference, orderNotes,
  } = order;

  const isPaid = !!paystackReference;
  const placedDate = new Date(placedAt).toLocaleDateString("en-GH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const getDeliveryStatusStep = (status: string) => {
    switch (status) {
      case "pending":         return 0;
      case "contacted":       return 1;
      case "driver_assigned": return 2;
      case "delivered":       return 3;
      default:                return 0;
    }
  };

  const currentStep = getDeliveryStatusStep(deliveryStatus || "pending");

  // Seller pickup location — falls back gracefully
  const sellerCity   = sellerProfile?.city   ?? null;
  const sellerRegion = sellerProfile?.region ?? null;
  const sellerName   = sellerProfile?.name   ?? null;
  const pickupLocation = [sellerCity, sellerRegion].filter(Boolean).join(", ") || null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div
        className="pt-24 section-padding max-w-3xl mx-auto pb-20"
        style={{ paddingTop: `calc(96px + env(safe-area-inset-top, 0px))` }}
      >
        {/* ── Success hero ── */}
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
          <h1 className="font-display text-4xl font-bold tracking-tight mb-2">You're all set!</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            {isPaid
              ? "Payment received! Your order is confirmed."
              : "Your order has been placed. The seller will be notified."}
          </p>
          <p className="text-xs text-muted-foreground mt-3 font-mono">
            {(() => {
              const num = parseInt(id.replace(/-/g, "").slice(0, 10), 16) % 1000000000;
              return `#${num.toString().padStart(9, "0")}`;
            })()}
          </p>
          {paystackReference && (
            <p className="text-[10px] text-muted-foreground mt-2 font-mono">Ref: {paystackReference}</p>
          )}
        </motion.div>

        {/* ── Delivery Status Tracker ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border p-6 mb-5"
        >
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-6">
            Delivery Status
          </p>
          <div className="flex items-start justify-between relative">
            <div className="absolute top-4 left-0 right-0 h-px bg-border" />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / 3) * 100}%` }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="absolute top-4 left-0 h-px bg-primary"
            />
            {statusSteps.map((step, i) => (
              <div key={step} className="flex flex-col items-center gap-2 relative z-10 flex-1 first:items-start last:items-end">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                  ${i <= currentStep
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background border-border text-muted-foreground"}`}>
                  {i <= currentStep
                    ? <CheckCircle className="w-4 h-4" />
                    : <span className="text-xs font-bold">{i + 1}</span>}
                </div>
                <span className={`text-[11px] font-medium text-center leading-tight
                  ${i <= currentStep ? "text-primary" : "text-muted-foreground"}`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-6 text-center">
            {deliveryStatus === "pending"         && "We'll contact you soon to arrange delivery"}
            {deliveryStatus === "contacted"       && "We've contacted you about delivery details"}
            {deliveryStatus === "driver_assigned" && "Driver assigned - delivery in progress"}
            {deliveryStatus === "delivered"       && "Order delivered successfully"}
          </p>
        </motion.div>

        {/* ── Delivery details + Payment — equal-height cards ── */}
        <div className="grid sm:grid-cols-2 gap-5 mb-5 items-stretch">

          {/* Delivery details card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl border border-border p-5 flex flex-col"
          >
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Delivery Details
            </p>

            {/* Method badge */}
            <div className={`inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-xl text-sm font-semibold mb-4
              ${delivery === "pickup"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-blue-500/10 text-blue-600 border border-blue-500/20"}`}>
              {delivery === "pickup"
                ? <><Store className="w-3.5 h-3.5" /> Store Pickup</>
                : <><Truck className="w-3.5 h-3.5" /> Home Delivery</>}
            </div>

            <p className="font-display font-semibold text-sm mb-3">
              {buyer.firstName} {buyer.lastName}
            </p>

            <div className="space-y-2 flex-1">
              {delivery === "pickup" ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Free pickup directly from the seller. No delivery fee.
                  </p>
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    {/* Dynamic seller location */}
                    {pickupLocation ? (
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="font-medium text-foreground">{pickupLocation}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span>Seller will share pickup location</span>
                      </div>
                    )}
                    {sellerName && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Store className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span>Seller: <span className="font-medium text-foreground">{sellerName}</span></span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span>{buyer.phone}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-3">
                    We'll contact you after payment to arrange delivery.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{buyer.address}, {buyer.city}, {buyer.region}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span>{buyer.phone}</span>
                    </div>
                  </div>
                  {/* Delivery info bullets */}
                  <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                    {[
                      "We'll call to confirm location",
                      "Pay delivery fee to driver on arrival",
                      "Delivery within 1–3 days after confirmation",
                    ].map(line => (
                      <div key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {orderNotes && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                  <MessageCircle className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Notes: {orderNotes}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Payment summary card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-border p-5 flex flex-col"
          >
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Payment
            </p>
            <div className="space-y-2.5 text-sm flex-1">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">GHS {subtotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Delivery</span>
                <span className="font-medium">
                  {delivery === "pickup"
                    ? <span className="text-green-600 font-semibold">Free</span>
                    : deliveryFee
                      ? `GHS ${deliveryFee}`
                      : <span className="text-muted-foreground italic text-xs">To be confirmed</span>}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-border pt-2.5 mt-1">
                <span className="font-display font-bold">Total Paid</span>
                <span className="font-display font-bold text-lg">GHS {total}</span>
              </div>
            </div>

            <div className="mt-5 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-xs text-muted-foreground">
                {isPaid
                  ? <><span className="mr-1">✅</span> Paid via Paystack</>
                  : <><span className="mr-1">💳</span> Pay with <span className="font-semibold text-foreground">Cash or MoMo</span> on delivery</>}
              </p>
            </div>

            {/* Placed date */}
            <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> {placedDate}
            </p>
          </motion.div>
        </div>

        {/* ── Delivery fee pending notice (delivery only, no fee yet) ── */}
        {delivery !== "pickup" && !deliveryFee && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
            className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 mb-5"
          >
            <div className="flex items-start gap-3">
              <MessageCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-display font-semibold text-sm text-blue-700 dark:text-blue-400">
                  Delivery Fee Pending
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  We'll contact you within 24 hours to confirm your delivery location and calculate the exact fee.
                  You'll pay this directly to the driver on arrival.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Tracking number (if seller has added it) ── */}
        {order.trackingNumber && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42 }}
            className="rounded-2xl border border-border p-5 mb-5"
          >
            <TrackingDisplay
              trackingNumber={order.trackingNumber}
              trackingUrl={order.trackingUrl}
              status={order.status}
              sellerConfirmed={order.sellerConfirmed}
            />
          </motion.div>
        )}

        {/* ── Items ordered ── */}
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
            {items.map((item: any) => (
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

        {/* ── CTAs ── */}
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
          <Link to="/account?tab=orders" className="flex-1">
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