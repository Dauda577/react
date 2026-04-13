import React, { memo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  User, MapPin, Store, Star, Pencil, CheckCircle, ArrowRight,
  LogOut, ShieldCheck, BadgeCheck, ChevronDown, Sparkles, Mail, Phone,
  Map, TrendingUp, X, Wallet, AlertTriangle, ShoppingBag,
  Ticket, RefreshCw, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRatings } from "@/context/RatingContext";
import { fadeUp, itemVariant } from "../Account/accountHelpers";
import { toast } from "sonner";
import { useOrders } from "@/context/OrderContext";
import { useListings } from "@/context/ListingContext";
import { supabase } from "@/lib/supabase";
import ReferralCard from "./ReferralCard";

const ghanaRegions = [
  "Greater Accra", "Ashanti", "Western", "Central", "Eastern", "Volta",
  "Northern", "North East", "Savannah", "Upper East", "Upper West",
  "Oti", "Bono", "Bono East", "Ahafo", "Western North",
];

interface Props {
  user: any;
  isGuest: boolean;
  role: string;
  isVerified: boolean;
  isOfficial: boolean;
  subaccountCode: string | null;
  verificationLoading: boolean;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  profileForm: { name: string; phone: string; city: string; region: string; bio: string };
  setProfileForm: (fn: (p: any) => any) => void;
  payoutForm: { number: string };
  avatarUrl: string | null;
  reviews: any[];
  onSaveProfile: () => void;
  onLogout: () => void;
  onVerify: () => void;
  onSetTab: (tab: string) => void;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, accent }: any) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="font-display font-bold text-sm">{value}</p>
    </div>
  </div>
);

// ── Promo Request Sheet ────────────────────────────────────────────────────────

type PromoRequestStatus = "idle" | "submitting" | "submitted";
type MyRequest = {
  id: string;
  status: "pending" | "approved" | "rejected";
  discount_amount: number;
  discount_type: string;
  expiry_date: string;
  promo_code_id: string | null;
  seen_at: string | null;
  promo_code?: string | null;
};

const PromoRequestSheet = ({
  userId,
  onClose,
  onSeen,
}: {
  userId: string;
  onClose: () => void;
  onSeen: () => void;
}) => {
  const [view, setView] = useState<"form" | "history">("form");
  const [status, setStatus] = useState<PromoRequestStatus>("idle");
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [form, setForm] = useState({
    discount_type: "percentage",
    discount_amount: "",
    expiry_date: "",
    max_uses: "1",
    note: "",
  });

  const fetchMyRequests = useCallback(async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from("promo_requests")
      .select("id, status, discount_amount, discount_type, expiry_date, promo_code_id, seen_at, promo_codes(code)")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      const mapped = data.map((d: any) => ({
        ...d,
        promo_code: d.promo_codes?.code ?? null,
      }));
      setMyRequests(mapped);

      // Mark unseen approved requests as seen
      const unseenIds = mapped
        .filter((r: MyRequest) => r.status === "approved" && !r.seen_at)
        .map((r: MyRequest) => r.id);

      if (unseenIds.length > 0) {
        await supabase
          .from("promo_requests")
          .update({ seen_at: new Date().toISOString() })
          .in("id", unseenIds);
        onSeen();
      }
    }
    setLoadingHistory(false);
  }, [userId, onSeen]);

  const handleViewHistory = () => {
    setView("history");
    fetchMyRequests();
  };

  const handleSubmit = async () => {
    if (!form.discount_amount || !form.expiry_date || !form.max_uses) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (new Date(form.expiry_date) <= new Date()) {
      toast.error("Expiry date must be in the future");
      return;
    }
    if (parseFloat(form.discount_amount) <= 0) {
      toast.error("Discount amount must be greater than 0");
      return;
    }

    setStatus("submitting");
    const { error } = await supabase.from("promo_requests").insert({
      seller_id: userId,
      discount_type: form.discount_type,
      discount_amount: parseFloat(form.discount_amount),
      expiry_date: form.expiry_date,
      max_uses: parseInt(form.max_uses),
      note: form.note || null,
      status: "pending",
    });

    if (error) {
      toast.error("Failed to submit request. Please try again.");
      setStatus("idle");
      return;
    }

    setStatus("submitted");
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl overflow-hidden"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Ticket className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base">Promo Code Request</h3>
              <p className="text-xs text-muted-foreground">We'll review and generate it for you</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-3 border-b border-border bg-muted/20">
          <button
            onClick={() => setView("form")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${view === "form" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              }`}
          >
            New Request
          </button>
          <button
            onClick={handleViewHistory}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${view === "history" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              }`}
          >
            My Requests
          </button>
        </div>

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">

          {/* ── Form view ── */}
          {view === "form" && (
            <>
              {status === "submitted" ? (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-7 h-7 text-green-500" />
                  </div>
                  <h4 className="font-display font-bold text-lg mb-2">Request Submitted!</h4>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    We'll review your request and generate your promo code. Check "My Requests" to see the status.
                  </p>
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleViewHistory}
                      className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
                    >
                      View My Requests
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                      Discount Type <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["percentage", "fixed"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setForm(f => ({ ...f, discount_type: t }))}
                          className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${form.discount_type === t
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                        >
                          {t === "percentage" ? "Percentage (%)" : "Fixed (GHS)"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Discount Amount <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                        {form.discount_type === "percentage" ? "%" : "GHS"}
                      </span>
                      <input
                        type="number"
                        value={form.discount_amount}
                        onChange={e => setForm(f => ({ ...f, discount_amount: e.target.value }))}
                        placeholder={form.discount_type === "percentage" ? "e.g. 10" : "e.g. 20"}
                        min={1}
                        max={form.discount_type === "percentage" ? 90 : undefined}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm
                          focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Expiry Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.expiry_date}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm
                        focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Max Uses <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      value={form.max_uses}
                      onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                      placeholder="e.g. 50"
                      min={1}
                      max={1000}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm
                        focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">How many customers can use this code</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Campaign / Reason (optional)
                    </label>
                    <textarea
                      value={form.note}
                      onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                      placeholder="e.g. Flash sale for new arrivals, Eid promo..."
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm
                        focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                        transition-all resize-none"
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={status === "submitting"}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold
                      hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {status === "submitting" ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Submitting...</>
                    ) : (
                      <><Ticket className="w-4 h-4" /> Submit Request</>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── History view ── */}
          {view === "history" && (
            <div className="space-y-3">
              {loadingHistory ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
              ) : myRequests.length === 0 ? (
                <div className="py-8 text-center">
                  <Ticket className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No requests yet.</p>
                </div>
              ) : (
                myRequests.map((req) => (
                  <div key={req.id} className="rounded-xl border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">
                        {req.discount_type === "percentage"
                          ? `${req.discount_amount}% off`
                          : `GH₵ ${req.discount_amount} off`}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${req.status === "pending"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : req.status === "approved"
                          ? "bg-green-500/10 text-green-600 border-green-500/20"
                          : "bg-red-500/10 text-red-500 border-red-500/20"
                        }`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Expires: {formatDate(req.expiry_date)}
                    </p>
                    {req.status === "approved" && req.promo_code && (
                      <div className="flex items-center gap-2 mt-1 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <p className="text-xs text-green-600">
                          Your code: <span className="font-mono font-bold">{req.promo_code}</span>
                        </p>
                      </div>
                    )}
                    {req.status === "pending" && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Under review — we'll generate your code shortly
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

const AccountProfile = memo(({
  user, isGuest, role, isVerified, isOfficial, subaccountCode,
  verificationLoading, editMode, setEditMode, profileForm, setProfileForm,
  payoutForm, avatarUrl, reviews, onSaveProfile, onLogout, onVerify, onSetTab,
}: Props) => {
  const navigate = useNavigate();
  const { getSellerStats } = useRatings();
  const { orders } = useOrders();
  const { listings } = useListings();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPromoSheet, setShowPromoSheet] = useState(false);
  const [hasUnseenPromo, setHasUnseenPromo] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null); // 👈 add rank state

  const isSeller = role === "seller";

  // Check for unseen approved promo codes on mount
  useEffect(() => {
    if (!user?.id || !isSeller) return;
    supabase
      .from("promo_requests")
      .select("id")
      .eq("seller_id", user.id)
      .eq("status", "approved")
      .is("seen_at", null)
      .limit(1)
      .then(({ data }) => {
        setHasUnseenPromo((data?.length ?? 0) > 0);
      });
  }, [user?.id, isSeller]);

  // 👇 Fetch seller rank
  useEffect(() => {
    if (!isSeller || !user?.id) return;
    supabase
      .from("seller_leaderboard")
      .select("id")
      .then(({ data }) => {
        if (!data) return;
        const rank = data.findIndex(s => s.id === user.id) + 1;
        if (rank > 0) setMyRank(rank);
      });
  }, [isSeller, user?.id]);

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : isGuest ? "G" : "?";

  const handleSaveProfile = useCallback(() => {
    if (!profileForm.name?.trim()) {
      toast.error("Please enter your name");
      return;
    }
    onSaveProfile();
  }, [profileForm, onSaveProfile]);

  const sellerOrdersList = orders?.filter(o => o.sellerId === user?.id) || [];
  const totalSales = sellerOrdersList.reduce((sum, o) => sum + o.total, 0);
  const orderCount = sellerOrdersList.length;

  const sellerListings = listings?.filter(l => l.sellerId === user?.id) || [];
  const activeListings = sellerListings.filter(l => l.status === "active").length;
  const totalListings = sellerListings.length;

  if (isGuest) return (
    <div>
      <div className="rounded-2xl border border-border p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <User className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-display text-xl font-bold mb-2">Guest Mode</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
          Create an account to buy, sell, track orders, and save your favourite items.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button className="btn-primary rounded-full h-10 px-6 text-sm" onClick={() => navigate("/auth")}>
            Sign In <ArrowRight className="ml-1.5 w-4 h-4" />
          </Button>
          <Button variant="outline" className="rounded-full h-10 px-6 text-sm" onClick={() => navigate("/auth")}>
            Create Account
          </Button>
        </div>
      </div>
      <button
        onClick={() => setShowLogoutConfirm(true)}
        className="mt-6 text-sm text-red-500 flex items-center gap-1.5 hover:opacity-70 transition-opacity mx-auto"
      >
        <LogOut className="w-3.5 h-3.5" /> Exit guest mode
      </button>
    </div>
  );

  const sellerReviews = reviews.filter((r: any) => r.sellerId === (user?.id ?? ""));
  const stats = getSellerStats(user?.id ?? "");
  const average = stats?.average ?? 0;
  const count = stats?.count ?? 0;
  const hasCompleteProfile = profileForm.name && profileForm.phone && profileForm.region;

  return (
    <div className="space-y-6">

      {/* 👇 REFERRAL CARD - Shows for ALL authenticated users (buyers AND sellers) */}
      <ReferralCard />

      {/* Stats — sellers only */}
      {isSeller && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={TrendingUp} label="Total Sales" value={`GH₵ ${totalSales.toLocaleString()}`} accent="bg-green-500/10 text-green-500" />
          <StatCard icon={ShoppingBag} label="Orders" value={orderCount.toString()} accent="bg-blue-500/10 text-blue-500" />
          <StatCard icon={Star} label="Rating" value={count > 0 ? `${average.toFixed(1)} (${count})` : "No reviews"} accent="bg-amber-500/10 text-amber-500" />
          <StatCard icon={Store} label="Listings" value={`${activeListings}/${totalListings}`} accent="bg-purple-500/10 text-purple-500" />
        </div>
      )}

      {/* 👇 Seller Rank Card - sellers only */}
      {isSeller && myRank && (
        <motion.div {...fadeUp}
          className="flex items-center gap-4 p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-base text-amber-700 dark:text-amber-400">
              #{myRank} Top Seller
            </p>
            <p className="text-sm text-muted-foreground">
              You're ranked #{myRank} on the leaderboard! Keep selling to climb higher.
            </p>
            <button
              onClick={() => navigate("/leaderboard")}
              className="mt-2 text-sm text-primary font-semibold flex items-center gap-1 hover:underline"
            >
              View Leaderboard <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Promo request button — sellers only */}
      {isSeller && (
        <button
          onClick={() => setShowPromoSheet(true)}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Ticket className="w-4 h-4 text-primary" />
              {hasUnseenPromo && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold flex items-center gap-2">
                Request a Promo Code
                {hasUnseenPromo && (
                  <span className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[10px] font-bold border border-green-500/20">
                    Code Ready
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {hasUnseenPromo
                  ? "Your promo code has been generated — tap to view"
                  : "Boost your sales with a discount code for your store"}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      )}

      {/* Profile form */}
      <div className="rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-base font-bold flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Profile Information
          </h3>
          {!editMode && (
            <button onClick={() => setEditMode(true)} className="text-xs text-primary flex items-center gap-1 hover:underline">
              <Pencil className="w-3 h-3" /> Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
              Full Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                value={profileForm.name}
                onChange={e => setProfileForm((p: any) => ({ ...p, name: e.target.value }))}
                disabled={!editMode}
                placeholder="Your full name"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                  focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all font-[inherit]"
              />
            </div>
          </div>

          <div>
            <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                value={user?.email ?? ""}
                disabled
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                value={profileForm.phone}
                onChange={e => setProfileForm((p: any) => ({ ...p, phone: e.target.value }))}
                disabled={!editMode}
                placeholder="+233 24 000 0000"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                  focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all font-[inherit]"
              />
            </div>
          </div>

          <div>
            <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
              City
            </label>
            <div className="relative">
              <Map className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                value={profileForm.city}
                onChange={e => setProfileForm((p: any) => ({ ...p, city: e.target.value }))}
                disabled={!editMode}
                placeholder="e.g. Kumasi"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                  focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all font-[inherit]"
              />
            </div>
          </div>

          <div>
            <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
              Region {isSeller && <span className="text-red-400 text-[10px] normal-case">*</span>}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              {editMode ? (
                <select
                  value={profileForm.region}
                  onChange={e => setProfileForm((p: any) => ({ ...p, region: e.target.value }))}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                    focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit] appearance-none cursor-pointer"
                >
                  <option value="">Select region</option>
                  {ghanaRegions.map(r => <option key={r}>{r}</option>)}
                </select>
              ) : (
                <input
                  value={profileForm.region || "Not set"}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground cursor-not-allowed"
                />
              )}
              {editMode && (
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              )}
            </div>
          </div>

          <div className="col-span-full">
            <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
              Bio
            </label>
            <textarea
              value={profileForm.bio}
              onChange={e => setProfileForm((p: any) => ({ ...p, bio: e.target.value }))}
              disabled={!editMode}
              rows={3}
              placeholder="Tell buyers a bit about yourself and your store..."
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-all font-[inherit]"
            />
          </div>
        </div>

        {!hasCompleteProfile && editMode && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-600">
              Please complete your profile (name, phone, and region) to continue.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-5 mt-2 border-t border-border">
          {editMode ? (
            <div className="flex gap-2">
              <Button
                className="btn-primary rounded-full h-9 px-6 text-sm"
                onClick={handleSaveProfile}
                disabled={!hasCompleteProfile}
              >
                <CheckCircle className="mr-1.5 w-3.5 h-3.5" /> Save Changes
              </Button>
              <Button variant="outline" className="rounded-full h-9 px-6 text-sm" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="rounded-full h-9 px-6 text-sm" onClick={() => setEditMode(true)}>
              <Pencil className="mr-1.5 w-3.5 h-3.5" /> Edit Profile
            </Button>
          )}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="text-sm text-red-500 flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </div>

      {/* Verification banners */}
      {isSeller && !isVerified && !isOfficial && (
        <motion.div {...fadeUp}
          className="flex items-start gap-4 p-5 rounded-2xl border border-green-500/30 bg-gradient-to-r from-green-500/5 to-transparent">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-base text-green-700 dark:text-green-400 mb-1">
              Get Verified — GH₵ 50 one-time fee
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Verified sellers get a ✅ badge, Paystack split payments, and significantly more sales.
              Buyers trust verified sellers 3x more!
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                disabled={verificationLoading}
                onClick={() => {
                  if (!user?.email) return;
                  if (!payoutForm.number?.trim()) {
                    onSetTab("settings");
                    toast.error("Please add your payout details first");
                    return;
                  }
                  onVerify();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-60"
              >
                {verificationLoading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                  : <><ShieldCheck className="w-4 h-4" /> Pay GH₵ 50 to Get Verified</>
                }
              </button>
              <button
                onClick={() => onSetTab("settings")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/30 transition-colors"
              >
                <Wallet className="w-4 h-4" /> Add Payout Details
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              ✅ Verification badge appears on all your listings
              <br />💰 95% of each sale paid directly to your MoMo
              <br />⚡ Faster payouts — next business day settlement
            </p>
          </div>
        </motion.div>
      )}

      {isSeller && isVerified && !isOfficial && (
        <motion.div {...fadeUp}
          className="flex items-start gap-4 p-5 rounded-2xl border border-green-500/30 bg-gradient-to-r from-green-500/5 to-transparent">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <BadgeCheck className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-base text-green-700 dark:text-green-400">Verified Seller ✅</p>
            <p className="text-sm text-muted-foreground mt-1">
              {subaccountCode
                ? "✅ Your Paystack split payment is active — 95% goes directly to your MoMo, settled next business day."
                : "✅ Your listings show the verified badge. Buyers trust verified sellers more!"}
            </p>
            {!subaccountCode && (
              <button
                onClick={() => onSetTab("settings")}
                className="mt-3 text-sm text-primary font-semibold flex items-center gap-1 hover:underline"
              >
                Complete Paystack setup <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      )}

      {isSeller && isOfficial && (
        <motion.div {...fadeUp}
          className="flex items-start gap-4 p-5 rounded-2xl border"
          style={{ borderColor: "#6d28d9", background: "linear-gradient(135deg, rgba(59,7,100,0.08), rgba(30,27,75,0.08))" }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(109,40,217,0.15)" }}>
            <Sparkles className="w-5 h-5" style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <p className="font-display font-semibold text-base" style={{ color: "#a78bfa" }}>Official Seller ✨</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your store is recognised as an official brand on SneakersHub.
              Your listings are permanently boosted and appear at the top of search results.
            </p>
          </div>
        </motion.div>
      )}

      {/* Reviews */}
      {isSeller && (
        <div className="rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <h3 className="font-display text-base font-bold flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" /> Buyer Reviews
              </h3>
              <p className="text-xs text-muted-foreground">What buyers are saying about your store</p>
            </div>
            {count > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={`w-4 h-4 ${n <= Math.round(average) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <span className="font-display font-bold text-lg">{average.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">/ 5 · {count} {count === 1 ? "review" : "reviews"}</span>
              </div>
            )}
          </div>

          {sellerReviews.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Complete orders to get rated by buyers.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              <AnimatePresence>
                {sellerReviews.map((review: any, i: number) => (
                  <motion.div key={review.id} {...itemVariant(i)}
                    className="rounded-xl border border-border p-4 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{review.buyerName?.[0] || "U"}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{review.buyerName || "Anonymous"}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString("en-GH", {
                              day: "numeric", month: "short", year: "numeric"
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star key={n} className={`w-3.5 h-3.5 ${n <= review.stars ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground leading-relaxed mt-2">{review.comment}</p>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Promo request bottom sheet */}
      <AnimatePresence>
        {showPromoSheet && user?.id && (
          <PromoRequestSheet
            userId={user.id}
            onClose={() => setShowPromoSheet(false)}
            onSeen={() => setHasUnseenPromo(false)}
          />
        )}
      </AnimatePresence>

      {/* Logout modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl bg-background border border-border p-6 shadow-2xl"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <LogOut className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">Sign Out</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Are you sure you want to sign out? You'll need to log in again to access your account.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/10 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setShowLogoutConfirm(false); onLogout(); }}
                    className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

AccountProfile.displayName = "AccountProfile";
export default AccountProfile;