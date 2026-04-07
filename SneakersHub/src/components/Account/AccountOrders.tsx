import React, { memo, useState, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag, CheckCircle, MapPin, Phone, Package,
  ArrowRight, User, Wallet, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatOrderId, statusColors, itemVariant, fadeUp } from "../Account/accountHelpers";
import { TrackingDisplay } from "@/components/TrackingDisplay";

const RatingModal = lazy(() => import("@/components/RatingModal"));

// ── PayoutBadge ───────────────────────────────────────────────────────────────
const PayoutBadge = ({ status }: { status: string }) => {
  if (status === "released" || status === "auto_released") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-600 border border-green-500/20">
      <Wallet className="w-2.5 h-2.5" /> Paid out
    </span>
  );
  if (status === "transfer_failed") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-600 border border-orange-500/20">
      <AlertTriangle className="w-2.5 h-2.5" /> Transfer issue
    </span>
  );
  return null;
};

// ── Guest banner ──────────────────────────────────────────────────────────────
const GuestAuthBanner = ({ action }: { action: string }) => {
  const navigate = useNavigate();
  return (
    <div className="text-center py-20">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <User className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-display text-lg font-bold tracking-tight mb-2">Sign in required</h3>
      <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
        You need an account to {action}. It only takes a minute.
      </p>
      <Button className="btn-primary rounded-full h-9 px-6 text-sm" onClick={() => navigate("/auth")}>
        Sign In / Sign Up
      </Button>
    </div>
  );
};

interface Props {
  isGuest: boolean;
  canSell: boolean;
  sellerOrders: any[];
  buyerOrders: any[];
  isVerified: boolean;
  isOfficial: boolean;
  trackingInputs: Record<string, string>;
  setTrackingInputs: (fn: (p: any) => any) => void;
  savingTracking: Record<string, boolean>;
  setSavingTracking: (fn: (p: any) => any) => void;
  confirmAsSeller: (id: string) => void;
  confirmAsBuyer: (id: string) => void;
  addTracking: (id: string, num: string) => Promise<void>;
  hasReviewed: (id: string) => boolean;
}

const AccountOrders = memo(({
  isGuest, canSell, sellerOrders, buyerOrders, isVerified, isOfficial,
  trackingInputs, setTrackingInputs, savingTracking, setSavingTracking,
  confirmAsSeller, confirmAsBuyer, addTracking, hasReviewed,
}: Props) => {
  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null);
  const [orderTab, setOrderTab] = useState<"sales" | "purchases">("sales");

  if (isGuest) return <GuestAuthBanner action="view or place orders" />;

  // ── Seller view (with Sales / Purchases toggle) ────────────────────────────
  if (canSell) {
    const orders = orderTab === "sales" ? sellerOrders : buyerOrders;

    return (
      <div>
        {/* Tab toggle */}
        <div className="flex gap-2 mb-6">
          {(["sales", "purchases"] as const).map(t => (
            <button
              key={t}
              onClick={() => setOrderTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all capitalize
                ${orderTab === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {t === "sales"
                ? `Sales (${sellerOrders.length})`
                : `Purchases (${buyerOrders.length})`}
            </button>
          ))}
        </div>

        {/* ── Sales tab ── */}
        {orderTab === "sales" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">
                {orders.length} {orders.length === 1 ? "order" : "orders"} received
              </p>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold tracking-tight mb-2">No orders yet</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  When buyers purchase your items, orders will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order, i) => (
                  <motion.div key={order.id} {...itemVariant(i)} className="rounded-2xl border border-border p-5">
                    {/* Order header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-display font-bold text-sm">{formatOrderId(order.id)}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[order.status]}`}>
                            {order.status}
                          </span>
                          {!order.seen && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">New</span>
                          )}
                          <PayoutBadge status={order.payoutStatus ?? "pending"} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(order.placedAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <p className="font-display font-bold text-base flex-shrink-0">GHS {order.total}</p>
                    </div>

                    {/* Items */}
                    <div className="space-y-2 mb-4">
                      {order.items.map((item: any) => (
                        <div key={`${item.id}-${item.size}`} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 p-1">
                            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">Size {item.size} · Qty {item.quantity}</p>
                          </div>
                          <p className="text-sm font-display font-bold flex-shrink-0">GHS {item.price * item.quantity}</p>
                        </div>
                      ))}
                    </div>

                    {/* Buyer info */}
                    <div className="border-t border-border pt-3 flex flex-wrap gap-4 mb-4">
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Buyer</p>
                        <p className="text-sm font-medium">{order.buyer.firstName} {order.buyer.lastName}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Phone</p>
                        <a href={`tel:${order.buyer.phone}`} className="text-sm font-medium text-primary hover:opacity-70 transition-opacity flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {order.buyer.phone}
                        </a>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Deliver to</p>
                        <p className="text-sm font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary" />{order.buyer.address}, {order.buyer.city}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Delivery Method</p>
                        <p className="text-sm font-medium flex items-center gap-1">
                          <Package className="w-3 h-3 text-primary" />{order.deliveryInfo?.label ?? order.delivery}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Est. cost: <span className="font-semibold text-foreground">{order.deliveryInfo?.estimatedCost ?? "—"}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{order.deliveryInfo?.days}</p>
                      </div>
                    </div>

                    {/* Confirmation */}
                    <div className="border-t border-border pt-4 space-y-3">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">Confirmation</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        {order.sellerConfirmed ? (
                          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-green-600">You confirmed dispatch — payment sent</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => confirmAsSeller(order.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all text-sm font-semibold text-primary"
                          >
                            <Package className="w-4 h-4" /> Mark as Sent
                          </button>
                        )}
                        <div className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold
                          ${order.buyerConfirmed ? "bg-green-500/10 border-green-500/20 text-green-600" : "bg-muted/30 border-border text-muted-foreground"}`}>
                          {order.buyerConfirmed
                            ? <><CheckCircle className="w-4 h-4 flex-shrink-0" /> Buyer confirmed receipt</>
                            : <><ShoppingBag className="w-4 h-4 flex-shrink-0" /> Waiting for buyer</>}
                        </div>
                      </div>

                      {/* Tracking */}
                      {order.sellerConfirmed && (isVerified || isOfficial) && (
                        order.trackingNumber ? (
                          <TrackingDisplay
                            trackingNumber={order.trackingNumber}
                            trackingUrl={order.trackingUrl ?? null}
                            status={order.status}
                            sellerConfirmed={order.sellerConfirmed}
                          />
                        ) : (
                          <div>
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Tracking Number</p>
                            <div className="flex gap-2">
                              <input
                                value={trackingInputs[order.id] ?? ""}
                                onChange={e => setTrackingInputs((p: any) => ({ ...p, [order.id]: e.target.value }))}
                                placeholder="e.g. GH-1234567890 (optional)"
                                className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground
                                  placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                              />
                              <button
                                disabled={!trackingInputs[order.id]?.trim() || savingTracking[order.id]}
                                onClick={async () => {
                                  const num = trackingInputs[order.id]?.trim();
                                  if (!num) return;
                                  setSavingTracking((p: any) => ({ ...p, [order.id]: true }));
                                  await addTracking(order.id, num);
                                  setSavingTracking((p: any) => ({ ...p, [order.id]: false }));
                                }}
                                className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
                              >
                                {savingTracking[order.id] ? "..." : "Save"}
                              </button>
                            </div>
                          </div>
                        )
                      )}

                      {order.sellerConfirmed && order.buyerConfirmed && (
                        <motion.div {...fadeUp}
                          className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <p className="text-xs font-semibold text-green-600">Order complete — both sides confirmed! 🎉</p>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Purchases tab (seller buying from others) ── */}
        {orderTab === "purchases" && (
          <div>
            {orders.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold tracking-tight mb-2">No purchases yet</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">Your purchase history will appear here.</p>
                <Link to="/shop">
                  <Button className="btn-primary rounded-full h-9 px-6 text-sm">
                    Shop Now <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-2">{orders.length} {orders.length === 1 ? "order" : "orders"} placed</p>
                {orders.map((order, i) => (
                  <motion.div key={order.id} {...itemVariant(i)} className="rounded-2xl border border-border p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-display font-bold text-sm">{formatOrderId(order.id)}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[order.status]}`}>
                            {order.status}
                          </span>
                          <PayoutBadge status={order.payoutStatus ?? "pending"} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(order.placedAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <p className="font-display font-bold text-base flex-shrink-0">GHS {order.total}</p>
                    </div>

                    <div className="space-y-2 mb-4">
                      {order.items.map((item: any) => (
                        <div key={`${item.id}-${item.size}`} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 p-1">
                            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">Size {item.size} · Qty {item.quantity}</p>
                          </div>
                          <p className="text-sm font-display font-bold flex-shrink-0">GHS {item.price * item.quantity}</p>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-border pt-3 mb-4 flex flex-wrap gap-4">
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Deliver to</p>
                        <p className="text-sm font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary" />{order.buyer.address}, {order.buyer.city}, {order.buyer.region}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Delivery Method</p>
                        <p className="text-sm font-medium flex items-center gap-1">
                          <Package className="w-3 h-3 text-primary" />{order.deliveryInfo?.label ?? order.delivery}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Est. cost: <span className="font-semibold text-foreground">{order.deliveryInfo?.estimatedCost ?? "—"}</span>
                          {order.deliveryInfo?.days && <span> · {order.deliveryInfo.days}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4 space-y-3">
                      <TrackingDisplay
                        trackingNumber={order.trackingNumber ?? null}
                        trackingUrl={order.trackingUrl ?? null}
                        status={order.status}
                        sellerConfirmed={order.sellerConfirmed}
                      />

                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">Confirmation</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold
                          ${order.sellerConfirmed ? "bg-green-500/10 border-green-500/20 text-green-600" : "bg-muted/30 border-border text-muted-foreground"}`}>
                          {order.sellerConfirmed
                            ? <><CheckCircle className="w-4 h-4 flex-shrink-0" /> Seller dispatched your order</>
                            : <><Package className="w-4 h-4 flex-shrink-0" /> Waiting for seller to dispatch</>}
                        </div>
                        {order.buyerConfirmed ? (
                          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-green-600">
                              {hasReviewed(order.id) ? "Receipt confirmed · Reviewed ⭐" : "You confirmed receipt"}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => order.sellerConfirmed && setRatingOrderId(order.id)}
                            disabled={!order.sellerConfirmed}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all
                              ${order.sellerConfirmed
                                ? "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary text-primary cursor-pointer"
                                : "border-border bg-muted/20 text-muted-foreground cursor-not-allowed opacity-50"}`}
                          >
                            <CheckCircle className="w-4 h-4" /> Confirm Receipt
                          </button>
                        )}
                      </div>

                      {order.sellerConfirmed && order.buyerConfirmed && (
                        <motion.div {...fadeUp}
                          className="mt-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <p className="text-xs font-semibold text-green-600">Order complete — enjoy your item! 🎉</p>
                        </motion.div>
                      )}
                      {order.sellerConfirmed && !order.buyerConfirmed && (
                        <div className="mt-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">Order dispatched — confirm receipt once your item arrives.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {ratingOrderId && (
          <Suspense fallback={null}>
            <RatingModal
              orderId={ratingOrderId}
              sellerId={buyerOrders.find((o: any) => o.id === ratingOrderId)?.sellerId ?? ""}
              onClose={() => setRatingOrderId(null)}
              onConfirmed={() => confirmAsBuyer(ratingOrderId)}
            />
          </Suspense>
        )}
      </div>
    );
  }

  // ── Pure buyer view ────────────────────────────────────────────────────────
  return (
    <div>
      {buyerOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-display text-lg font-bold tracking-tight mb-2">No orders yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">Your purchase history will appear here.</p>
          <Link to="/shop">
            <Button className="btn-primary rounded-full h-9 px-6 text-sm">
              Shop Now <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-2">{buyerOrders.length} {buyerOrders.length === 1 ? "order" : "orders"} placed</p>
          {buyerOrders.map((order, i) => (
            <motion.div key={order.id} {...itemVariant(i)} className="rounded-2xl border border-border p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-bold text-sm">{formatOrderId(order.id)}</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                    <PayoutBadge status={order.payoutStatus ?? "pending"} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(order.placedAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <p className="font-display font-bold text-base flex-shrink-0">GHS {order.total}</p>
              </div>

              <div className="space-y-2 mb-4">
                {order.items.map((item: any) => (
                  <div key={`${item.id}-${item.size}`} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 p-1">
                      <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Size {item.size} · Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm font-display font-bold flex-shrink-0">GHS {item.price * item.quantity}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-3 mb-4 flex flex-wrap gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Deliver to</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary" />{order.buyer.address}, {order.buyer.city}, {order.buyer.region}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Delivery Method</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Package className="w-3 h-3 text-primary" />{order.deliveryInfo?.label ?? order.delivery}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Est. cost: <span className="font-semibold text-foreground">{order.deliveryInfo?.estimatedCost ?? "—"}</span>
                    {order.deliveryInfo?.days && <span> · {order.deliveryInfo.days}</span>}
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <TrackingDisplay
                  trackingNumber={order.trackingNumber ?? null}
                  trackingUrl={order.trackingUrl ?? null}
                  status={order.status}
                  sellerConfirmed={order.sellerConfirmed}
                />

                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">Confirmation</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold
                    ${order.sellerConfirmed ? "bg-green-500/10 border-green-500/20 text-green-600" : "bg-muted/30 border-border text-muted-foreground"}`}>
                    {order.sellerConfirmed
                      ? <><CheckCircle className="w-4 h-4 flex-shrink-0" /> Seller dispatched your order</>
                      : <><Package className="w-4 h-4 flex-shrink-0" /> Waiting for seller to dispatch</>}
                  </div>
                  {order.buyerConfirmed ? (
                    <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-xs font-semibold text-green-600">
                        {hasReviewed(order.id) ? "Receipt confirmed · Reviewed ⭐" : "You confirmed receipt"}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => order.sellerConfirmed && setRatingOrderId(order.id)}
                      disabled={!order.sellerConfirmed}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all
                        ${order.sellerConfirmed
                          ? "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary text-primary cursor-pointer"
                          : "border-border bg-muted/20 text-muted-foreground cursor-not-allowed opacity-50"}`}
                    >
                      <CheckCircle className="w-4 h-4" /> Confirm Receipt
                    </button>
                  )}
                </div>

                {order.sellerConfirmed && order.buyerConfirmed && (
                  <motion.div {...fadeUp}
                    className="mt-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-green-600">Order complete — enjoy your item! 🎉</p>
                  </motion.div>
                )}
                {order.sellerConfirmed && !order.buyerConfirmed && (
                  <div className="mt-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">Order dispatched — confirm receipt once your item arrives.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {ratingOrderId && (
        <Suspense fallback={null}>
          <RatingModal
            orderId={ratingOrderId}
            sellerId={buyerOrders.find((o: any) => o.id === ratingOrderId)?.sellerId ?? ""}
            onClose={() => setRatingOrderId(null)}
            onConfirmed={() => confirmAsBuyer(ratingOrderId)}
          />
        </Suspense>
      )}
    </div>
  );
});

AccountOrders.displayName = "AccountOrders";
export default AccountOrders;