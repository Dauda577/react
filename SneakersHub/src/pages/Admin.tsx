import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert, TrendingUp, Package, Wallet, AlertTriangle,
  CheckCircle, Clock, RefreshCw, ChevronDown, ChevronUp,
  ArrowUpRight, DollarSign, BarChart2, X,
  Filter, Search, Phone, MapPin,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
type AdminOrder = {
  id: string;
  placed_at: string;
  total: number;
  status: string;
  payout_status: string;
  dispute_reason: string | null;
  release_at: string | null;
  seller_confirmed: boolean;
  buyer_confirmed: boolean;
  seller_id: string;
  buyer_id: string;
  buyer_first_name: string;
  buyer_last_name: string;
  buyer_phone: string;
  buyer_city: string;
  seller_name?: string;
  seller_phone?: string;
  seller_is_official?: boolean;
};

const COMMISSION_RATE = 0.05;

const formatId = (id: string) => {
  const num = parseInt(id.replace(/-/g, "").slice(0, 10), 16) % 1000000000;
  return `#${num.toString().padStart(9, "0")}`;
};

const formatGHS = (n: number) =>
  `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const payoutColors: Record<string, string> = {
  pending:      "bg-amber-500/10 text-amber-600 border-amber-500/20",
  released:     "bg-green-500/10 text-green-600 border-green-500/20",
  auto_released:"bg-blue-500/10 text-blue-600 border-blue-500/20",
  disputed:     "bg-red-500/10 text-red-600 border-red-500/20",
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: any; accent: string;
}) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">{label}</p>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div>
      <p className="font-display text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

const SectionHeader = ({ title, icon: Icon, count }: { title: string; icon: any; count?: number }) => (
  <div className="flex items-center gap-2.5 mb-5">
    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
      <Icon className="w-3.5 h-3.5 text-primary" />
    </div>
    <h2 className="font-display font-bold text-base tracking-tight">{title}</h2>
    {count !== undefined && (
      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{count}</span>
    )}
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
function formatOrderId(id: string) {
  const num = parseInt(id.replace(/-/g, "").slice(0, 10), 16) % 1000000000;
  return `#${num.toString().padStart(9, "0")}`;
}

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "disputes" | "failed" | "orders" | "payouts">("overview");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [resolvingDispute, setResolvingDispute] = useState<string | null>(null);

  const [authChecked, setAuthChecked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // No user at all
    if (!user?.id) {
      console.log("[Admin] No user, redirecting");
      navigate("/");
      return;
    }

    // Check is_official directly
    supabase
      .from("profiles")
      .select("is_official")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        console.log("[Admin] Profile check:", { data, error, userId: user.id });
        if (error || !data?.is_official) {
          console.log("[Admin] Not official, denying access");
          setAccessDenied(true);
        } else {
          console.log("[Admin] Access granted");
          setAuthChecked(true);
        }
      });
  }, [user?.id, authLoading]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rawOrders } = await supabase
        .from("orders")
        .select("*, seller:profiles!orders_seller_id_fkey(name, phone, is_official)")
        .order("placed_at", { ascending: false });

      setOrders((rawOrders ?? []).map((o: any) => ({
        ...o,
        seller_name: o.seller?.name ?? "Unknown",
        seller_phone: o.seller?.phone ?? null,
        seller_is_official: o.seller?.is_official ?? false,
      })));
    } catch (err) {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (authChecked) fetchData(); }, [authChecked]);

  // Realtime — auto-refresh admin dashboard when any order changes
  useEffect(() => {
    if (!authChecked) return;
    const channel = supabase
      .channel("admin:orders:realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "orders",
      }, () => {
        fetchData(); // refetch all data on any order insert/update
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authChecked, fetchData]);

  if (authLoading || (!authChecked && !accessDenied)) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Verifying access...</p>
      </div>
    </div>
  );

  if (accessDenied) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-display font-bold text-lg">Access Denied</p>
        <p className="text-sm text-muted-foreground mt-1">This page is for official accounts only.</p>
        <button onClick={() => navigate("/")} className="mt-4 px-4 py-2 rounded-full border border-border text-sm hover:bg-muted/40 transition-colors">
          Go Home
        </button>
      </div>
    </div>
  );

  // ── Computed stats ─────────────────────────────────────────────────────────
  const nonOfficialOrders = orders.filter(o => !o.seller_is_official);
  const pendingOrders     = nonOfficialOrders.filter(o => o.payout_status === "pending");
  const disputedOrders    = orders.filter(o => o.payout_status === "disputed");
  const failedOrders      = orders.filter(o => o.payout_status === "transfer_failed");
  const releasedOrders    = nonOfficialOrders.filter(o => o.payout_status === "released" || o.payout_status === "auto_released");
  const officialOrders    = orders.filter(o => o.seller_is_official);

  const now         = new Date();
  const weekAgo     = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart  = new Date(now); todayStart.setHours(0,0,0,0);

  const commission = {
    total:      releasedOrders.reduce((s, o) => s + o.total * COMMISSION_RATE, 0),
    this_month: releasedOrders.filter(o => new Date(o.placed_at) >= monthStart).reduce((s, o) => s + o.total * COMMISSION_RATE, 0),
    this_week:  releasedOrders.filter(o => new Date(o.placed_at) >= weekAgo).reduce((s, o) => s + o.total * COMMISSION_RATE, 0),
    today:      releasedOrders.filter(o => new Date(o.placed_at) >= todayStart).reduce((s, o) => s + o.total * COMMISSION_RATE, 0),
  };

  // ── Resolve dispute ────────────────────────────────────────────────────────
  const resolveDispute = async (orderId: string, favorOf: "buyer" | "seller") => {
    setResolvingDispute(orderId);
    try {
      if (favorOf === "seller") {
        // Step 1: Reset payout_status to "pending" so release-payment will process it
        const { error: resetError } = await supabase
          .from("orders")
          .update({ payout_status: "pending" })
          .eq("id", orderId);
        if (resetError) throw new Error(`Reset failed: ${resetError.message}`);

        // Step 2: Call release-payment
        const { data, error } = await supabase.functions.invoke("release-payment", {
          body: JSON.stringify({ order_id: orderId, trigger: "manual_admin", caller_id: user?.id }),
          headers: { "Content-Type": "application/json" },
        });
        if (error) throw new Error(`Edge Function error: ${error.message}`);
        if (data?.error) throw new Error(`Payment error: ${data.error}`);

        toast.success("Funds released to seller ✓");
      } else {
        // Refund buyer — set to refunded, open Paystack for manual refund
        const { error } = await supabase
          .from("orders")
          .update({ payout_status: "refunded" })
          .eq("id", orderId);
        if (error) throw new Error(error.message);
        toast.success("Marked as refunded — opening Paystack to process the refund", { duration: 6000 });
        window.open("https://dashboard.paystack.com/#/transactions", "_blank");
      }
      setResolvingDispute(null);
      await fetchData();
    } catch (err: any) {
      console.error("resolveDispute error:", err);
      toast.error(err.message ?? "Failed to resolve dispute");
      setResolvingDispute(null);
    }
  };

  // ── Filtered orders ────────────────────────────────────────────────────────
  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      o.buyer_first_name.toLowerCase().includes(q) ||
      o.buyer_last_name.toLowerCase().includes(q) ||
      (o.seller_name ?? "").toLowerCase().includes(q) ||
      formatId(o.id).includes(q);
    const matchStatus = statusFilter === "all" || o.payout_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const payoutHistory = releasedOrders;

  const tabs = [
    { id: "overview",  label: "Overview",   icon: BarChart2 },
    { id: "disputes",  label: "Disputes",   icon: AlertTriangle, badge: disputedOrders.length },
    { id: "failed",    label: "Failed Transfers", icon: AlertTriangle, badge: failedOrders.length },
    { id: "orders",    label: "All Orders", icon: Package },
    { id: "payouts",   label: "Payouts",    icon: Wallet },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="border-b border-border pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-0">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 pb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground mt-0.5">SneakersHub · Official accounts only</p>
            </div>
            <button onClick={fetchData}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium hover:bg-muted/40 transition-colors">
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </motion.div>

          <div className="flex overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all
                  ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {"badge" in tab && tab.badge > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

            {/* ── Overview ── */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                <div>
                  <SectionHeader title="Escrow" icon={Clock} />
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Held in Escrow" value={formatGHS(pendingOrders.reduce((s,o) => s+o.total, 0))}
                      sub={`${pendingOrders.length} pending orders`} icon={Clock} accent="bg-amber-500/10 text-amber-600" />
                    <StatCard label="Disputed" value={formatGHS(disputedOrders.reduce((s,o) => s+o.total, 0))}
                      sub={`${disputedOrders.length} active disputes`} icon={AlertTriangle} accent="bg-red-500/10 text-red-600" />
                    {failedOrders.length > 0 && (
                      <StatCard label="Failed Transfers" value={formatGHS(failedOrders.reduce((s,o) => s+o.total, 0))}
                        sub={`${failedOrders.length} need attention`} icon={AlertTriangle} accent="bg-orange-500/10 text-orange-600" />
                    )}
                    <StatCard label="Total Released" value={formatGHS(releasedOrders.reduce((s,o) => s+o.total, 0))}
                      sub={`${releasedOrders.length} orders`} icon={CheckCircle} accent="bg-green-500/10 text-green-600" />
                    <StatCard label="Official Sales (yours)" value={formatGHS(officialOrders.reduce((s,o) => s+o.total, 0))}
                      sub="bypasses escrow" icon={ShieldAlert} accent="bg-purple-500/10 text-purple-600" />
                  </div>
                </div>

                <div>
                  <SectionHeader title="Commission Earnings (5%)" icon={TrendingUp} />
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="All Time"    value={formatGHS(commission.total)}      icon={DollarSign}   accent="bg-primary/10 text-primary" />
                    <StatCard label="This Month"  value={formatGHS(commission.this_month)} icon={BarChart2}    accent="bg-purple-500/10 text-purple-600" />
                    <StatCard label="This Week"   value={formatGHS(commission.this_week)}  icon={TrendingUp}   accent="bg-blue-500/10 text-blue-600" />
                    <StatCard label="Today"       value={formatGHS(commission.today)}      icon={ArrowUpRight} accent="bg-green-500/10 text-green-600" />
                  </div>
                </div>

                {disputedOrders.length > 0 && (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <p className="font-display font-bold text-sm text-red-600">
                          {disputedOrders.length} dispute{disputedOrders.length > 1 ? "s" : ""} need your attention
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatGHS(disputedOrders.reduce((s,o) => s+o.total, 0))} frozen
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab("disputes")}
                      className="px-4 py-2 rounded-full bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors flex-shrink-0">
                      Resolve Now
                    </button>
                  </motion.div>
                )}

                {/* Breakdown table */}
                <div>
                  <SectionHeader title="Order Breakdown" icon={BarChart2} />
                  <div className="rounded-2xl border border-border overflow-hidden">
                    {(["pending","released","auto_released","disputed"] as const).map((status, i) => {
                      const subset = nonOfficialOrders.filter(o => o.payout_status === status);
                      const labels: Record<string, string> = {
                        pending: "Pending / In Escrow", released: "Released to Seller",
                        auto_released: "Auto-Released", disputed: "Disputed",
                      };
                      return (
                        <div key={status} className={`flex items-center justify-between px-5 py-4 gap-4 ${i > 0 ? "border-t border-border" : ""}`}>
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border ${payoutColors[status]}`}>
                              {labels[status]}
                            </span>
                            <span className="text-xs text-muted-foreground">{subset.length} orders</span>
                          </div>
                          <p className="font-display font-bold text-sm">{formatGHS(subset.reduce((s,o) => s+o.total, 0))}</p>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-muted/20">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Official Sales</span>
                      <p className="font-display font-bold text-sm">{formatGHS(officialOrders.reduce((s,o) => s+o.total, 0))}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Disputes ── */}
            {activeTab === "disputes" && (
              <div>
                <SectionHeader title="Active Disputes" icon={AlertTriangle} count={disputedOrders.length} />
                {disputedOrders.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="font-display font-bold text-lg">No active disputes</p>
                    <p className="text-sm text-muted-foreground mt-1">All orders are running smoothly.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {disputedOrders.map((order, i) => (
                      <motion.div key={order.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-display font-bold text-sm">{formatId(order.id)}</p>
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">Disputed</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(order.placed_at).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <p className="font-display font-bold text-lg text-red-600">{formatGHS(order.total)}</p>
                        </div>

                        {order.dispute_reason && (
                          <div className="rounded-xl bg-red-500/5 border border-red-500/15 p-3 mb-4">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Buyer's reason</p>
                            <p className="text-sm">"{order.dispute_reason}"</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="rounded-xl border border-border p-3">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Buyer</p>
                            <p className="text-sm font-semibold">{order.buyer_first_name} {order.buyer_last_name}</p>
                            <a href={`tel:${order.buyer_phone}`} className="text-xs text-primary flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3" /> {order.buyer_phone}
                            </a>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" /> {order.buyer_city}
                            </p>
                          </div>
                          <div className="rounded-xl border border-border p-3">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Seller</p>
                            <p className="text-sm font-semibold">{order.seller_name}</p>
                            {order.seller_phone && (
                              <a href={`tel:${order.seller_phone}`} className="text-xs text-primary flex items-center gap-1 mt-1">
                                <Phone className="w-3 h-3" /> {order.seller_phone}
                              </a>
                            )}
                          </div>
                        </div>

                        {resolvingDispute === order.id ? (
                          <div className="space-y-3">
                            <p className="text-xs font-semibold">Who should receive the funds?</p>
                            <div className="flex gap-2">
                              <button onClick={() => resolveDispute(order.id, "seller")}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                                Release to Seller
                              </button>
                              <button onClick={() => resolveDispute(order.id, "buyer")}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors">
                                Refund Buyer
                              </button>
                              <button onClick={() => setResolvingDispute(null)}
                                className="px-3 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted/40 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setResolvingDispute(order.id)}
                            className="w-full px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-sm font-semibold text-primary">
                            Resolve Dispute
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Failed Transfers tab ── */}
            {activeTab === "failed" && (
              <div className="space-y-4">
                {failedOrders.length === 0 ? (
                  <div className="text-center py-16">
                    <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                    <p className="font-display font-bold">No failed transfers</p>
                    <p className="text-sm text-muted-foreground mt-1">All payouts are processing normally.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20">
                      <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                          {failedOrders.length} transfer{failedOrders.length > 1 ? "s" : ""} failed — action needed
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          These sellers have not been paid. You can retry automatically or resolve manually via Paystack.
                        </p>
                      </div>
                    </div>
                    {failedOrders.map((order) => {
                      const orderId = (() => {
                        const num = parseInt(order.id.replace(/-/g, "").slice(0, 10), 16) % 1000000000;
                        return `#${num.toString().padStart(9, "0")}`;
                      })();
                      return (
                        <div key={order.id} className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-display font-bold text-sm">{order.seller_name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {orderId} · GHS {order.total} · {order.transfer_attempts ?? 1} attempt{(order.transfer_attempts ?? 1) > 1 ? "s" : ""}
                              </p>
                              {order.transfer_failure_reason && (
                                <p className="text-xs text-orange-600 mt-1 font-medium">
                                  ↳ {order.transfer_failure_reason}
                                </p>
                              )}
                            </div>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20 flex-shrink-0">Failed</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={async () => {
                                toast("Retrying transfer...");
                                try {
                                  await supabase.functions.invoke("retry-failed-transfers");
                                  toast.success("Retry triggered — refreshing in 3s");
                                  setTimeout(() => fetchData(), 3000);
                                } catch { toast.error("Retry failed — try Paystack dashboard"); }
                              }}
                              className="py-2.5 rounded-xl border border-orange-500/30 text-xs font-semibold text-orange-600 hover:bg-orange-500/10 transition-colors">
                              Retry Transfer
                            </button>
                            <a href="https://dashboard.paystack.com/#/transfers" target="_blank" rel="noreferrer"
                              className="py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors text-center flex items-center justify-center">
                              Open Paystack →
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* ── All Orders ── */}
            {activeTab === "orders" && (
              <div>
                <SectionHeader title="All Orders" icon={Package} count={filteredOrders.length} />
                <div className="flex flex-wrap gap-3 mb-5">
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search buyer, seller, order ID..."
                      className="bg-transparent text-sm flex-1 outline-none placeholder:text-muted-foreground font-[inherit]" />
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-transparent text-sm outline-none text-foreground font-[inherit] cursor-pointer">
                      <option value="all">All statuses</option>
                      <option value="pending">Pending</option>
                      <option value="released">Released</option>
                      <option value="auto_released">Auto-released</option>
                      <option value="disputed">Disputed</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredOrders.length === 0 && (
                    <div className="text-center py-16 text-sm text-muted-foreground">No orders match your filters.</div>
                  )}
                  {filteredOrders.map((order, i) => (
                    <motion.div key={order.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.025 }} className="rounded-2xl border border-border overflow-hidden">
                      <button onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors text-left">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-display font-bold text-sm">{formatId(order.id)}</p>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${payoutColors[order.payout_status] ?? payoutColors.pending}`}>
                              {order.payout_status.replace("_", " ")}
                            </span>
                            {order.seller_is_official && (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                                Official
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {order.buyer_first_name} {order.buyer_last_name} → {order.seller_name} ·{" "}
                            {new Date(order.placed_at).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="font-display font-bold text-sm">{formatGHS(order.total)}</p>
                            {!order.seller_is_official && (
                              <p className="text-[11px] text-muted-foreground">fee: {formatGHS(order.total * COMMISSION_RATE)}</p>
                            )}
                          </div>
                          {expandedOrder === order.id
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedOrder === order.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t border-border">
                            <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Buyer</p>
                                <p className="text-sm font-medium">{order.buyer_first_name} {order.buyer_last_name}</p>
                                <a href={`tel:${order.buyer_phone}`} className="text-xs text-primary flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" /> {order.buyer_phone}
                                </a>
                              </div>
                              <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Seller</p>
                                <p className="text-sm font-medium">{order.seller_name}</p>
                                {order.seller_phone && (
                                  <a href={`tel:${order.seller_phone}`} className="text-xs text-primary flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3" /> {order.seller_phone}
                                  </a>
                                )}
                              </div>
                              <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Confirmations</p>
                                <p className="text-xs flex items-center gap-1.5 mt-0.5">
                                  {order.seller_confirmed ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Clock className="w-3 h-3 text-muted-foreground" />}
                                  Seller {order.seller_confirmed ? "confirmed" : "pending"}
                                </p>
                                <p className="text-xs flex items-center gap-1.5 mt-0.5">
                                  {order.buyer_confirmed ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Clock className="w-3 h-3 text-muted-foreground" />}
                                  Buyer {order.buyer_confirmed ? "confirmed" : "pending"}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Auto-release</p>
                                <p className="text-xs">
                                  {order.release_at
                                    ? new Date(order.release_at).toLocaleDateString("en-GH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                                    : order.seller_is_official ? "N/A — Official" : "—"}
                                </p>
                              </div>
                            </div>
                            {order.dispute_reason && (
                              <div className="px-5 pb-4">
                                <div className="rounded-xl bg-red-500/5 border border-red-500/15 p-3">
                                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Dispute reason</p>
                                  <p className="text-sm">"{order.dispute_reason}"</p>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Payouts ── */}
            {activeTab === "payouts" && (
              <div>
                <SectionHeader title="Seller Payout History" icon={Wallet} count={payoutHistory.length} />
                {payoutHistory.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <p className="font-display font-bold text-lg">No payouts yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Payouts appear here once orders are confirmed.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border overflow-hidden">
                    <div className="hidden sm:grid grid-cols-4 px-5 py-3 bg-muted/30 border-b border-border">
                      {["Order", "Seller", "Sale Total", "Paid Out (95%)"].map(h => (
                        <p key={h} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</p>
                      ))}
                    </div>
                    {payoutHistory.map((order, i) => (
                      <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.025 }}
                        className={`grid grid-cols-2 sm:grid-cols-4 items-center px-5 py-4 gap-2 ${i > 0 ? "border-t border-border" : ""} hover:bg-muted/10 transition-colors`}>
                        <div>
                          <p className="font-display font-bold text-sm">{formatId(order.id)}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(order.placed_at).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium truncate">{order.seller_name}</p>
                          <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${payoutColors[order.payout_status]}`}>
                            {order.payout_status === "auto_released" ? "auto" : "confirmed"}
                          </span>
                        </div>
                        <p className="font-display font-semibold text-sm hidden sm:block">{formatGHS(order.total)}</p>
                        <div>
                          <p className="font-display font-bold text-sm text-green-600">{formatGHS(order.total * (1 - COMMISSION_RATE))}</p>
                          <p className="text-[11px] text-muted-foreground">−{formatGHS(order.total * COMMISSION_RATE)} fee</p>
                        </div>
                      </motion.div>
                    ))}
                    <div className="grid grid-cols-2 sm:grid-cols-4 items-center px-5 py-4 border-t-2 border-border bg-muted/20">
                      <p className="font-display font-bold text-sm col-span-2">Total Commission Earned</p>
                      <p className="font-display font-bold text-sm hidden sm:block">
                        {formatGHS(payoutHistory.reduce((s,o) => s+o.total, 0))}
                      </p>
                      <p className="font-display font-bold text-sm text-primary">{formatGHS(commission.total)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
};

export default Admin;