import React, { memo, useState, lazy, Suspense, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag, CheckCircle, MapPin, Phone, Package,
  ArrowRight, User, Wallet, AlertTriangle, Clock,
  Truck, Calendar, Eye, Star, Filter, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatOrderId, statusColors, itemVariant, fadeUp } from "../Account/accountHelpers";
import { TrackingDisplay } from "@/components/TrackingDisplay";

const RatingModal = lazy(() => import("@/components/RatingModal"));

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

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    pending:    { icon: <Clock className="w-2.5 h-2.5" />,     label: "Pending",    color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    processing: { icon: <Truck className="w-2.5 h-2.5" />,     label: "Processing", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    shipped:    { icon: <Package className="w-2.5 h-2.5" />,   label: "Shipped",    color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    delivered:  { icon: <CheckCircle className="w-2.5 h-2.5" />, label: "Delivered", color: "bg-green-500/10 text-green-600 border-green-500/20" },
    completed:  { icon: <CheckCircle className="w-2.5 h-2.5" />, label: "Completed", color: "bg-green-500/10 text-green-600 border-green-500/20" },
    cancelled:  { icon: <AlertTriangle className="w-2.5 h-2.5" />, label: "Cancelled", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
};

const OrderSummaryCard = ({ order, isSellerView }: { order: any; isSellerView?: boolean }) => (
  <div className="space-y-2 mb-4">
    {order.items.map((item: any) => (
      <div key={`${item.id}-${item.size}`} className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 p-1.5">
          <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            Size {item.size} · Qty {item.quantity}
            {isSellerView && ` · GHS ${item.price} each`}
          </p>
        </div>
        <p className="text-sm font-display font-bold flex-shrink-0">GHS {item.price * item.quantity}</p>
      </div>
    ))}
  </div>
);

const DeliveryInfoCard = ({ order }: { order: any }) => (
  <div className="border-t border-border pt-3 flex flex-wrap gap-4 mb-4">
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Deliver to</p>
      <p className="text-sm font-medium flex items-center gap-1">
        <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
        {order.buyer.address}, {order.buyer.city}, {order.buyer.region}
      </p>
    </div>
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Delivery Method</p>
      <p className="text-sm font-medium flex items-center gap-1">
        <Package className="w-3 h-3 text-primary flex-shrink-0" />
        {order.deliveryInfo?.label ?? order.delivery}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        Est. cost: <span className="font-semibold text-foreground">{order.deliveryInfo?.estimatedCost ?? "—"}</span>
        {order.deliveryInfo?.days && <span> · {order.deliveryInfo.days}</span>}
      </p>
    </div>
    {order.trackingNumber && (
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Tracking #</p>
        <p className="text-sm font-mono font-medium">{order.trackingNumber}</p>
      </div>
    )}
  </div>
);

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

const EmptyState = ({ title, message, actionText, actionLink }: {
  title: string; message: string; actionText?: string; actionLink?: string;
}) => (
  <div className="text-center py-20">
    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
      <ShoppingBag className="w-6 h-6 text-primary" />
    </div>
    <h3 className="font-display text-xl font-bold tracking-tight mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">{message}</p>
    {actionText && actionLink && (
      <Link to={actionLink}>
        <Button className="btn-primary rounded-full h-10 px-6 text-sm">
          {actionText} <ArrowRight className="ml-1.5 w-4 h-4" />
        </Button>
      </Link>
    )}
  </div>
);

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  if (isGuest) return <GuestAuthBanner action="view or place orders" />;

  // Badge counts — persist until order is fully complete
  const incompleteSalesCount = sellerOrders.filter(o => !(o.sellerConfirmed && o.buyerConfirmed)).length;
  const incompletePurchasesCount = buyerOrders.filter(o => !o.buyerConfirmed).length;

  const filterOrders = useCallback((orders: any[]) => {
    return orders.filter(order => {
      const matchesSearch = searchTerm === "" ||
        formatOrderId(order.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some((item: any) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const filteredSellerOrders = useMemo(() => filterOrders(sellerOrders), [filterOrders, sellerOrders]);
  const filteredBuyerOrders = useMemo(() => filterOrders(buyerOrders), [filterOrders, buyerOrders]);

  const handleAddTracking = useCallback(async (orderId: string) => {
    const trackingNum = trackingInputs[orderId]?.trim();
    if (!trackingNum) return;
    setSavingTracking((p: any) => ({ ...p, [orderId]: true }));
    await addTracking(orderId, trackingNum);
    setSavingTracking((p: any) => ({ ...p, [orderId]: false }));
  }, [trackingInputs, addTracking, setSavingTracking]);

  const getUniqueStatuses = (orders: any[]) => {
    const statuses = new Set(orders.map(o => o.status));
    return ["all", ...Array.from(statuses)];
  };

  if (canSell) {
    const currentOrders = orderTab === "sales" ? filteredSellerOrders : filteredBuyerOrders;
    const statuses = getUniqueStatuses(orderTab === "sales" ? sellerOrders : buyerOrders);

    return (
      <div>
        {/* Tab toggle with badge counts */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            {(["sales", "purchases"] as const).map(t => {
              const badgeCount = t === "sales" ? incompleteSalesCount : incompletePurchasesCount;
              return (
                <button
                  key={t}
                  onClick={() => setOrderTab(t)}
                  className={`relative px-4 py-1.5 rounded-full text-sm font-semibold transition-all capitalize
                    ${orderTab === t
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"}`}
                >
                  {t === "sales" ? "Sales" : "Purchases"}
                  {badgeCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-[10px] font-bold">
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {currentOrders.length > 0 && (
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search orders..."
                  className="pl-9 pr-3 py-1.5 rounded-full border border-border bg-background text-sm w-48 focus:outline-none focus:border-primary"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-full border border-border bg-background text-sm focus:outline-none focus:border-primary"
              >
                {statuses.map(s => (
                  <option key={s} value={s}>{s === "all" ? "All Status" : s}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── Sales tab ── */}
        {orderTab === "sales" && (
          <div>
            {filteredSellerOrders.length === 0 ? (
              searchTerm || statusFilter !== "all" ? (
                <EmptyState
                  title="No matching orders"
                  message={`No orders found matching "${searchTerm}"${statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}`}
                />
              ) : (
                <EmptyState
                  title="No orders yet"
                  message="When buyers purchase your items, orders will appear here."
                  actionText="Start Selling"
                  actionLink="/listings/new"
                />
              )
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {filteredSellerOrders.length} {filteredSellerOrders.length === 1 ? "order" : "orders"} received
                    {(searchTerm || statusFilter !== "all") && " (filtered)"}
                  </p>
                  {(searchTerm || statusFilter !== "all") && (
                    <button onClick={() => { setSearchTerm(""); setStatusFilter("all"); }} className="text-xs text-primary hover:underline">
                      Clear filters
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {filteredSellerOrders.map((order, i) => (
                    <motion.div key={order.id} {...itemVariant(i)} className="rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-display font-bold text-sm">{formatOrderId(order.id)}</p>
                            <StatusBadge status={order.status} />
                            {!order.seen && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                                New
                              </span>
                            )}
                            <PayoutBadge status={order.payoutStatus ?? "pending"} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(order.placedAt).toLocaleDateString("en-GH", {
                              day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                            })}
                          </p>
                        </div>
                        <p className="font-display font-bold text-lg flex-shrink-0">GHS {order.total}</p>
                      </div>

                      <OrderSummaryCard order={order} isSellerView />

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
                        <DeliveryInfoCard order={order} />
                      </div>

                      <div className="border-t border-border pt-4 space-y-3">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">Confirmation</p>
                        <div className="flex flex-col sm:flex-row gap-3">
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
                              : <><Clock className="w-4 h-4 flex-shrink-0" /> Waiting for buyer confirmation</>}
                          </div>
                        </div>

                        {order.sellerConfirmed && (isVerified || isOfficial) && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            {order.trackingNumber ? (
                              <TrackingDisplay
                                trackingNumber={order.trackingNumber}
                                trackingUrl={order.trackingUrl ?? null}
                                status={order.status}
                                sellerConfirmed={order.sellerConfirmed}
                              />
                            ) : (
                              <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <Truck className="w-3 h-3" /> Tracking Number (Optional)
                                </p>
                                <div className="flex gap-2">
                                  <input
                                    value={trackingInputs[order.id] ?? ""}
                                    onChange={e => setTrackingInputs((p: any) => ({ ...p, [order.id]: e.target.value }))}
                                    placeholder="e.g. GH-1234567890"
                                    className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm
                                      placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                  />
                                  <button
                                    disabled={!trackingInputs[order.id]?.trim() || savingTracking[order.id]}
                                    onClick={() => handleAddTracking(order.id)}
                                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
                                  >
                                    {savingTracking[order.id] ? (
                                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : "Save"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {order.sellerConfirmed && order.buyerConfirmed && (
                          <motion.div {...fadeUp} className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <p className="text-xs font-semibold text-green-600">Order complete — both sides confirmed! 🎉</p>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Purchases tab ── */}
        {orderTab === "purchases" && (
          <div>
            {filteredBuyerOrders.length === 0 ? (
              searchTerm || statusFilter !== "all" ? (
                <EmptyState
                  title="No matching orders"
                  message={`No purchases found matching "${searchTerm}"${statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}`}
                />
              ) : (
                <EmptyState
                  title="No purchases yet"
                  message="Your purchase history will appear here."
                  actionText="Shop Now"
                  actionLink="/shop"
                />
              )
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {filteredBuyerOrders.length} {filteredBuyerOrders.length === 1 ? "order" : "orders"} placed
                    {(searchTerm || statusFilter !== "all") && " (filtered)"}
                  </p>
                  {(searchTerm || statusFilter !== "all") && (
                    <button onClick={() => { setSearchTerm(""); setStatusFilter("all"); }} className="text-xs text-primary hover:underline">
                      Clear filters
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {filteredBuyerOrders.map((order, i) => (
                    <motion.div key={order.id} {...itemVariant(i)} className="rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-display font-bold text-sm">{formatOrderId(order.id)}</p>
                            <StatusBadge status={order.status} />
                            <PayoutBadge status={order.payoutStatus ?? "pending"} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(order.placedAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <p className="font-display font-bold text-lg flex-shrink-0">GHS {order.total}</p>
                      </div>

                      <OrderSummaryCard order={order} />
                      <DeliveryInfoCard order={order} />

                      <div className="border-t border-border pt-4 space-y-3">
                        <TrackingDisplay
                          trackingNumber={order.trackingNumber ?? null}
                          trackingUrl={order.trackingUrl ?? null}
                          status={order.status}
                          sellerConfirmed={order.sellerConfirmed}
                        />

                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">Confirmation</p>
                        <div className="flex flex-col sm:flex-row gap-3">
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
                          <motion.div {...fadeUp} className="mt-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <p className="text-xs font-semibold text-green-600">Order complete — enjoy your item! 🎉</p>
                          </motion.div>
                        )}
                        {order.sellerConfirmed && !order.buyerConfirmed && (
                          <div className="mt-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">Order dispatched — confirm receipt once your item arrives.</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
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
  const filteredBuyerOnlyOrders = useMemo(() => filterOrders(buyerOrders), [filterOrders, buyerOrders]);
  const buyerStatuses = getUniqueStatuses(buyerOrders);

  return (
    <div>
      {buyerOrders.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <p className="text-sm text-muted-foreground">
            {filteredBuyerOnlyOrders.length} {filteredBuyerOnlyOrders.length === 1 ? "order" : "orders"} placed
          </p>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search orders..."
                className="pl-9 pr-3 py-1.5 rounded-full border border-border bg-background text-sm w-48 focus:outline-none focus:border-primary"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-full border border-border bg-background text-sm focus:outline-none focus:border-primary"
            >
              {buyerStatuses.map(s => (
                <option key={s} value={s}>{s === "all" ? "All Status" : s}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {filteredBuyerOnlyOrders.length === 0 ? (
        searchTerm || statusFilter !== "all" ? (
          <EmptyState
            title="No matching orders"
            message={`No orders found matching "${searchTerm}"${statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}`}
          />
        ) : (
          <EmptyState
            title="No orders yet"
            message="Your purchase history will appear here."
            actionText="Shop Now"
            actionLink="/shop"
          />
        )
      ) : (
        <div className="space-y-4">
          {(searchTerm || statusFilter !== "all") && (
            <div className="flex justify-end">
              <button onClick={() => { setSearchTerm(""); setStatusFilter("all"); }} className="text-xs text-primary hover:underline">
                Clear filters
              </button>
            </div>
          )}
          {filteredBuyerOnlyOrders.map((order, i) => (
            <motion.div key={order.id} {...itemVariant(i)} className="rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-bold text-sm">{formatOrderId(order.id)}</p>
                    <StatusBadge status={order.status} />
                    <PayoutBadge status={order.payoutStatus ?? "pending"} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(order.placedAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <p className="font-display font-bold text-lg flex-shrink-0">GHS {order.total}</p>
              </div>

              <OrderSummaryCard order={order} />
              <DeliveryInfoCard order={order} />

              <div className="border-t border-border pt-4 space-y-3">
                <TrackingDisplay
                  trackingNumber={order.trackingNumber ?? null}
                  trackingUrl={order.trackingUrl ?? null}
                  status={order.status}
                  sellerConfirmed={order.sellerConfirmed}
                />

                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">Confirmation</p>
                <div className="flex flex-col sm:flex-row gap-3">
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
                  <motion.div {...fadeUp} className="mt-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-green-600">Order complete — enjoy your item! 🎉</p>
                  </motion.div>
                )}
                {order.sellerConfirmed && !order.buyerConfirmed && (
                  <div className="mt-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
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