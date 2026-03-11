// src/pages/Account.tsx — escrow and dispute features removed
// Payment transfers immediately when seller marks as sent
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  User, LayoutGrid, ShoppingBag, Heart, Settings,
  MapPin, Eye, Pencil, Trash2, Plus, CheckCircle, ArrowRight, LogOut,
  Store, Tag, Package, Phone, Zap, Star, Sparkles, BadgeCheck,
  Bell, ShieldCheck, Shield, Lock, Trash, ChevronRight, MessageCircle, BarChart2, Share,
  Camera, Type, DollarSign, Ruler, X, AlertTriangle, Wallet, CreditCard,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useSaved } from "@/context/SavedContext";
import { useOrders } from "@/context/OrderContext";
import { useAuth } from "@/context/AuthContext";
import { useListings, boostDaysLeft, isBoostActive } from "@/context/ListingContext";
import { useRatings } from "@/context/RatingContext";
import { useMessages } from "@/context/MessageContext";
import BoostModal from "@/components/BoostModal";
import RatingModal from "@/components/RatingModal";
import MessagesInbox from "@/components/MessagesInbox";
import SellerDashboard from "@/components/SellerDashboard";
import { usePush } from "@/context/PushContext";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const isSafari = () =>
  typeof navigator !== "undefined" &&
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isIOS = () =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true);

const FIRST_LISTING_BANNER_KEY = "sneakershub-first-listing-dismissed";
const FIRST_LISTING_NOTIF_KEY  = "sneakershub-first-listing-notif-sent";

const sellerTabs = [
  { id: "profile",   label: "Profile",   icon: User },
  { id: "orders",    label: "Orders",    icon: ShoppingBag },
  { id: "listings",  label: "Listings",  icon: LayoutGrid },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "messages",  label: "Messages",  icon: MessageCircle },
  { id: "settings",  label: "Settings",  icon: Settings },
];
const buyerTabs = [
  { id: "profile",  label: "Profile",  icon: User },
  { id: "orders",   label: "Orders",   icon: ShoppingBag },
  { id: "saved",    label: "Saved",    icon: Heart },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "settings", label: "Settings", icon: Settings },
];
const guestTabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "saved",   label: "Saved",   icon: Heart },
];

const statusColors: Record<string, string> = {
  pending:   "bg-yellow-500/10 text-yellow-600",
  shipped:   "bg-purple-500/10 text-purple-600",
  delivered: "bg-green-500/10 text-green-600",
};

const formatOrderId = (id: string) => {
  const num = parseInt(id.replace(/-/g, "").slice(0, 10), 16) % 1000000000;
  return `#${num.toString().padStart(9, "0")}`;
};

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

const FirstListingBanner = ({ onDismiss, onStart }: { onDismiss: () => void; onStart: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: 0.3 }}
    className="rounded-2xl border border-primary/30 bg-primary/5 p-5 mb-6 relative overflow-hidden">
    <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
    <button onClick={onDismiss}
      className="absolute top-3 right-3 w-6 h-6 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10">
      <X className="w-3 h-3" />
    </button>
    <div className="flex items-start gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Store className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="font-display font-bold text-sm">Welcome! Let's get your first listing up 🎉</p>
        <p className="text-xs text-muted-foreground mt-0.5">It takes less than 2 minutes. Here's what you'll need:</p>
      </div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      {[
        { icon: Camera,    label: "A photo",      sub: "Clear, well-lit shot" },
        { icon: Type,      label: "Name & brand", sub: "e.g. Nike Air Max" },
        { icon: DollarSign,label: "Your price",   sub: "In GHS" },
        { icon: Ruler,     label: "Sizes",        sub: "EU sizing" },
      ].map(({ icon: Icon, label, sub }) => (
        <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-background border border-border text-center">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-xs font-semibold leading-tight">{label}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>
        </div>
      ))}
    </div>
    <div className="flex items-center gap-3 flex-wrap">
      <Button className="btn-primary rounded-full h-9 px-5 text-sm" onClick={onStart}>
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Create My First Listing
      </Button>
      <button onClick={onDismiss} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
        I'll do it later
      </button>
    </div>
  </motion.div>
);

const FirstListingEmptyState = ({ onStart }: { onStart: () => void }) => (
  <div className="text-center py-16">
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
      <Store className="w-7 h-7 text-primary" />
    </motion.div>
    <h3 className="font-display text-xl font-bold tracking-tight mb-2">Start selling today</h3>
    <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-8">
      List your sneakers in minutes and reach buyers across Ghana.
    </p>
    <div className="max-w-sm mx-auto mb-8 space-y-3 text-left">
      {[
        { step: "1", title: "Take a clear photo",       desc: "Natural light works best. Show the sole too." },
        { step: "2", title: "Add details & price",      desc: "Brand, name, condition, sizes, and your asking price." },
        { step: "3", title: "Publish & wait for buyers",desc: "Your listing goes live instantly. Boost it to get seen faster." },
      ].map(({ step, title, desc }) => (
        <div key={step} className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card">
          <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-bold text-primary">{step}</span>
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
        </div>
      ))}
    </div>
    <Button className="btn-primary rounded-full h-10 px-8 text-sm" onClick={onStart}>
      <Plus className="w-3.5 h-3.5 mr-1.5" /> Create My First Listing
    </Button>
    <p className="text-xs text-muted-foreground mt-3">Free to list · No commission</p>
  </div>
);

const NotificationSettings = ({
  pushSupported, pushPermission, requestPermission,
}: {
  pushSupported: boolean;
  pushPermission: NotificationPermission;
  requestPermission: () => Promise<boolean>;
}) => {
  const safari     = isSafari() || isIOS();
  const standalone = isStandalone();

  if (safari && !standalone) return (
    <div className="px-5 py-4 flex items-start gap-3 bg-blue-500/5 border-b border-border">
      <Share className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold">Enable Notifications on Safari</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Tap <span className="font-semibold text-blue-500">Share</span> ⎋ then{" "}
          <span className="font-semibold">"Add to Home Screen"</span> — then reopen from your home screen to enable notifications.
        </p>
      </div>
    </div>
  );
  if (!pushSupported) return (
    <div className="px-5 py-3 border-b border-border">
      <p className="text-xs text-muted-foreground">Push notifications not supported. Try Chrome or Firefox.</p>
    </div>
  );
  if (pushPermission === "default") return (
    <div className="px-5 py-4 flex items-center justify-between gap-4 bg-primary/5 border-b border-border">
      <div>
        <p className="text-sm font-semibold text-primary">Enable Push Notifications</p>
        <p className="text-xs text-muted-foreground mt-0.5">Get notified about orders and messages</p>
      </div>
      <button onClick={async () => {
        const granted = await requestPermission();
        if (granted) toast.success("🔔 Notifications enabled!");
        else toast("Enable in your browser settings.");
      }} className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0 hover:opacity-90 transition-opacity">
        Enable
      </button>
    </div>
  );
  if (pushPermission === "denied") return (
    <div className="px-5 py-4 flex items-start gap-3 bg-muted/30 border-b border-border">
      <Bell className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold">Notifications Blocked</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Go to your browser's site settings and set Notifications to Allow.
        </p>
      </div>
    </div>
  );
  if (pushPermission === "granted") return (
    <div className="px-5 py-3 flex items-center gap-2 bg-green-500/5 border-b border-border">
      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
      <p className="text-xs text-green-600 font-medium">Push notifications are active ✓</p>
    </div>
  );
  return null;
};

// ── Payout status badge ───────────────────────────────────────────────────────
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

function ensurePaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).PaystackPop) { resolve(); return; }
    const existing = document.querySelector('script[src*="paystack"]');
    let attempts = 0;
    const poll = setInterval(() => {
      if ((window as any).PaystackPop) { clearInterval(poll); resolve(); return; }
      if (++attempts > 20) { clearInterval(poll); reject(new Error("Paystack SDK not available")); }
    }, 300);
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

const Account = () => {
  const { user, isGuest, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [editMode, setEditMode]   = useState(false);

  const role = user?.role ?? "buyer";
  const tabs = isGuest ? guestTabs : role === "seller" ? sellerTabs : buyerTabs;

  const { saved, toggleSaved } = useSaved();
  const { orders, unseenCount, markOrdersSeen, confirmAsSeller, confirmAsBuyer } = useOrders();
  const { listings, deleteListing, markSold, boostListing } = useListings();
  const { getSellerStats, hasReviewed, reviews, fetchReviews } = useRatings();
  const { totalUnread } = useMessages();
  const { requestPermission, isSupported: pushSupported, permission: pushPermission, showLocalNotification } = usePush();

  const [boostingListing, setBoostingListing] = useState<import("@/context/ListingContext").Listing | null>(null);
  const [ratingOrderId,   setRatingOrderId]   = useState<string | null>(null);
  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(null);
  const [isVerified,          setIsVerified]          = useState(false);
  const [subaccountCode,      setSubaccountCode]      = useState<string | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [isOfficial,      setIsOfficial]      = useState(false);
  const [showFirstListingBanner, setShowFirstListingBanner] = useState(false);

  const [notifOrders,     setNotifOrders]     = useState(() => localStorage.getItem("notif_orders") !== "false");
  const [notifMessages,   setNotifMessages]   = useState(() => localStorage.getItem("notif_messages") !== "false");
  const [notifPromotions, setNotifPromotions] = useState(() => localStorage.getItem("notif_promotions") === "true");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [payoutForm, setPayoutForm]   = useState({ method: "", number: "", name: "", bankCode: "" });
  const [payoutSaved, setPayoutSaved] = useState(false);
  const [hasMissingPayoutDetails, setHasMissingPayoutDetails] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "Guest",
    phone: "",
    city: "",
    bio: isGuest
      ? "Browsing as guest."
      : role === "seller"
        ? "Trusted seller based in Accra. Quality sneakers, fair prices."
        : "Sneaker enthusiast based in Accra.",
  });

  // ── First-listing banner ───────────────────────────────────────────────────
  useEffect(() => {
    if (role !== "seller" || isGuest) return;
    const dismissed = localStorage.getItem(FIRST_LISTING_BANNER_KEY);
    if (!dismissed && listings.length === 0) {
      setShowFirstListingBanner(true);
      const notifSent = localStorage.getItem(FIRST_LISTING_NOTIF_KEY);
      if (!notifSent && Notification.permission === "granted") {
        setTimeout(() => {
          showLocalNotification("👟 Ready to start selling?", "Create your first listing — it takes less than 2 minutes!", "/account");
          localStorage.setItem(FIRST_LISTING_NOTIF_KEY, "true");
        }, 3000);
      }
    }
  }, [role, isGuest, listings.length]);

  const dismissFirstListingBanner = () => { setShowFirstListingBanner(false); localStorage.setItem(FIRST_LISTING_BANNER_KEY, "true"); };
  const startFirstListing = () => { dismissFirstListingBanner(); navigate("/listings/new"); };

  useEffect(() => {
    if (!user?.id) return;
    import("@/lib/supabase").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        const photo = data?.user?.user_metadata?.avatar_url ?? data?.user?.user_metadata?.picture ?? null;
        setAvatarUrl(photo);
      });
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    import("@/lib/supabase").then(({ supabase }) => {
      supabase.from("profiles")
        .select("name, phone, city, verified, is_official, subaccount_code, payout_method, payout_number, payout_name")
        .eq("id", user.id).single()
        .then(({ data }) => {
          if (!data) return;
          setProfileForm(p => ({ ...p, name: data.name ?? p.name, phone: data.phone ?? "", city: data.city ?? "" }));
          setIsVerified(data.verified ?? false);
          setSubaccountCode(data.subaccount_code ?? null);
          setIsOfficial(data.is_official ?? false);
          if (data.payout_method) setPayoutForm({ method: data.payout_method, number: data.payout_number ?? "", name: data.payout_name ?? "", bankCode: data.payout_bank_code ?? "" });
          if (data.verified && (!data.payout_method || !data.payout_number)) setHasMissingPayoutDetails(true);
        });
    });
  }, [user?.id]);

  useEffect(() => { if (role === "seller" && activeTab === "orders") markOrdersSeen(); }, [role, activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && ["profile","orders","listings","analytics","messages","settings"].includes(tab)) {
      setActiveTab(tab as any);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const boostListingId = params.get("boost_success");
    if (!boostListingId || !user?.id) return;
    window.history.replaceState({}, "", window.location.pathname);
    boostListing(boostListingId)
      .then(() => { toast.success("🎉 Listing boosted! Featured for 10 days."); setActiveTab("listings"); })
      .catch(() => toast.error("Payment received but boost failed. Contact support."));
  }, [user?.id]);

  useEffect(() => {
    if (role === "seller" && activeTab === "profile" && user?.id) fetchReviews(user.id);
  }, [role, activeTab, user?.id]);

  const toggleNotif = (key: string, value: boolean, set: (v: boolean) => void) => { set(value); localStorage.setItem(key, String(value)); };
  const handleLogout = async () => { await logout(); navigate("/"); };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase.from("profiles").update({
        name: profileForm.name, phone: profileForm.phone || null, city: profileForm.city || null,
      }).eq("id", user.id);
      if (error) throw error;
      setEditMode(false); toast.success("Profile updated!");
    } catch (err: any) { toast.error(err.message ?? "Failed to save profile"); }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    try {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated!"); setShowChangePassword(false); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) { toast.error(err.message ?? "Failed to update password"); }
  };

  const handleDeleteAccount = async () => {
    try {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase.functions.invoke("delete-account", { body: { user_id: user?.id } });
      if (error) { await supabase.auth.signOut(); toast.success("Signed out. Contact support to complete deletion."); navigate("/"); return; }
      await supabase.auth.signOut(); toast.success("Account deleted."); navigate("/");
    } catch (err: any) { toast.error(err.message ?? "Failed to delete account"); }
    setShowDeleteConfirm(false);
  };

  const initials = user?.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : isGuest ? "G" : "?";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Profile header ── */}
      <section className="relative pt-16 border-b border-border">
        <div className="section-padding max-w-4xl mx-auto pt-14 pb-0">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex items-center gap-5 pb-8">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {avatarUrl
                  ? <img src={avatarUrl} alt={user?.name ?? "avatar"} className="w-full h-full object-cover" />
                  : <span className="font-display text-xl font-bold text-primary">{initials}</span>}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                  ${isGuest ? "bg-muted text-muted-foreground border border-border"
                    : role === "seller" ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-secondary text-muted-foreground border border-border"}`}>
                  {isGuest ? <><User className="w-3 h-3" /> Guest</>
                    : role === "seller" ? <><Store className="w-3 h-3" /> Seller Account</>
                    : <><Tag className="w-3 h-3" /> Buyer Account</>}
                </div>
                {!isGuest && role === "seller" && (
                  <>
                    {isOfficial && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                        style={{ background: "linear-gradient(135deg,#3b0764,#1e1b4b)", color: "#a78bfa", borderColor: "#6d28d9" }}>
                        <Sparkles className="w-3 h-3" /> Official
                      </span>
                    )}
                    {!isOfficial && isVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-green-600 bg-green-500/10 border border-green-500/20">
                        <BadgeCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                    {!isOfficial && !isVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-muted-foreground bg-muted/40 border border-border">
                        <User className="w-3 h-3" /> Unverified
                      </span>
                    )}
                  </>
                )}
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {isGuest ? "Guest" : profileForm.name || user?.name || "User"}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-primary" />
                {isGuest ? "Ghana" : [profileForm.city, "Ghana"].filter(Boolean).join(", ") || "Ghana"}
              </p>
              {!isGuest && role === "seller" && (() => {
                const result  = getSellerStats(user?.id ?? "");
                const average = result?.average ?? 0;
                const count   = result?.count ?? 0;
                return count > 0 ? (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[1,2,3,4,5].map(n => <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(average) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />)}
                    <span className="text-xs font-semibold ml-0.5">{average}</span>
                    <span className="text-xs text-muted-foreground">({count} {count === 1 ? "review" : "reviews"})</span>
                  </div>
                ) : <p className="text-xs text-muted-foreground mt-1">No reviews yet</p>;
              })()}
            </div>
            {!isGuest && (
              <Button onClick={() => { setActiveTab("profile"); setEditMode(!editMode); }}
                variant="outline" className="rounded-full h-9 px-5 text-sm hidden sm:flex">
                {editMode ? <><CheckCircle className="mr-1.5 w-3.5 h-3.5" /> Done</> : <><Pencil className="mr-1.5 w-3.5 h-3.5" /> Edit</>}
              </Button>
            )}
          </motion.div>

          {/* Tabs */}
          <div className="flex overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 flex-1 sm:flex-none px-3 sm:px-5 py-3 sm:py-3.5
                  text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200
                  ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <tab.icon className="w-5 h-5 sm:w-4 sm:h-4" />
                <span>{tab.label}</span>
                {tab.id === "orders" && role === "seller" && unseenCount > 0 && (
                  <span className="absolute top-2 right-2 sm:static sm:ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{unseenCount}</span>
                )}
                {tab.id === "saved" && saved.length > 0 && (
                  <span className="absolute top-2 right-2 sm:static sm:ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{saved.length}</span>
                )}
                {tab.id === "messages" && totalUnread > 0 && (
                  <span className="absolute top-2 right-2 sm:static sm:ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{totalUnread > 9 ? "9+" : totalUnread}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tab content ── */}
      <section className="section-padding max-w-4xl mx-auto py-10">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>

            {/* Profile */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                {isGuest ? (
                  <div>
                    <div className="rounded-2xl border border-border p-6 text-center mb-6">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-display text-lg font-bold mb-1">You're browsing as a guest</h3>
                      <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">Create an account to buy, sell, track orders, and save your favourite sneakers.</p>
                      <Button className="btn-primary rounded-full h-9 px-6 text-sm" onClick={() => navigate("/auth")}>
                        Sign In / Sign Up <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <button onClick={handleLogout} className="text-sm text-red-500 flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                      <LogOut className="w-3.5 h-3.5" /> Exit guest mode
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { label: "Full Name", name: "name",  value: editMode ? profileForm.name : (user?.name ?? ""), placeholder: "Your name" },
                        { label: "Email",     name: "email", value: user?.email ?? "", placeholder: "", disabled: true },
                        { label: "Phone",     name: "phone", value: profileForm.phone, placeholder: "+233 24 000 0000" },
                        { label: "City",      name: "city",  value: profileForm.city,  placeholder: "Accra" },
                      ].map(({ label, name, value, placeholder, disabled }) => (
                        <div key={name}>
                          <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">{label}</label>
                          <input value={value} onChange={e => setProfileForm(p => ({ ...p, [name]: e.target.value }))}
                            disabled={disabled || !editMode} placeholder={placeholder}
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-[inherit]" />
                        </div>
                      ))}
                      <div className="col-span-full">
                        <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">Bio</label>
                        <textarea value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                          disabled={!editMode} rows={3}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-all font-[inherit]" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      {editMode
                        ? <Button className="btn-primary rounded-full h-9 px-6 text-sm" onClick={handleSaveProfile}>Save Changes <CheckCircle className="ml-1.5 w-3.5 h-3.5" /></Button>
                        : <Button variant="outline" className="rounded-full h-9 px-6 text-sm" onClick={() => setEditMode(true)}><Pencil className="mr-1.5 w-3.5 h-3.5" /> Edit Profile</Button>}
                      <button onClick={handleLogout} className="text-sm text-red-500 flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                        <LogOut className="w-3.5 h-3.5" /> Sign out
                      </button>
                    </div>
                    {role === "seller" && !isVerified && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-4 p-5 rounded-2xl border border-green-500/30 bg-green-500/5">
                        <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <ShieldCheck className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-display font-semibold text-sm text-green-700 dark:text-green-400 mb-1">Get Verified — GHS 50 one-time fee</p>
                          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                            Verified sellers get a ✅ badge, Paystack split payments (buyers pay you directly), and significantly more sales.
                          </p>
                          <button
                            disabled={verificationLoading}
                            onClick={async () => {
                              if (!user?.email) { toast.error("Please add your email first"); return; }
                              // Capture payout details NOW before async work
                              const payoutNumber = payoutForm.number?.trim();
                              const payoutMethod = payoutForm.method?.trim();
                              if (!payoutNumber) {
                                toast.error("Please save your MoMo/bank payout details in Settings first before verifying.");
                                return;
                              }
                              // Map payout method to Paystack bank code
                              const settlementBank = payoutMethod === "momo_telecel" ? "VOD"
                                : payoutMethod === "momo_airteltigo" ? "ATL"
                                : payoutMethod === "bank" ? (payoutForm.bankCode?.trim() || "ghipss")
                                : "MTN"; // MTN default
                              setVerificationLoading(true);
                              try {
                                await ensurePaystackScript();
                                const PaystackPop = (window as any).PaystackPop;
                                if (!PaystackPop) throw new Error("Payment SDK not available");
                                const ref = `verify_${Date.now()}_${user.id.slice(0, 6)}`;
                                const handler = PaystackPop.setup({
                                  key: "pk_live_9e1705a04e21f148e758dc11c1e920ed6393702b",
                                  email: user.email,
                                  amount: 5000, // GHS 50 in pesewas
                                  currency: "GHS",
                                  ref,
                                  channels: ["card", "mobile_money"],
                                  metadata: { custom_fields: [{ display_name: "Purpose", variable_name: "purpose", value: "seller_verification" }] },
                                  callback: (response: { reference: string }) => {
                                    // Paystack requires a sync callback — run async work outside
                                    const ref = response.reference;
                                    setTimeout(async () => {
                                      try {
                                        const { data: { session } } = await supabase.auth.getSession();
                                        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-subaccount`;
                                        const res = await fetch(fnUrl, {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                            "Authorization": `Bearer ${session?.access_token}`,
                                            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
                                          },
                                          body: JSON.stringify({
                                            seller_id: user.id,
                                            paystack_reference: ref,
                                            settlement_bank: settlementBank,
                                            account_number: payoutNumber,
                                            percentage_charge: 5, // platform keeps 5%, seller gets 95%
                                          }),
                                        });
                                        const result = await res.json();
                                        if (result.success) {
                                          setIsVerified(true);
                                          setSubaccountCode(result.subaccount_code);
                                          // Clear listings cache so buyers see updated subaccount_code immediately
                                          (window as any).__listingsCache = null;
                                          toast.success("🎉 You're now a verified seller! Your badge is now live.", { duration: 6000 });
                                        } else {
                                          throw new Error(result.error ?? "Verification failed");
                                        }
                                      } catch (err: any) {
                                        toast.error(err.message ?? "Verification failed — your payment went through but setup failed. Contact support with your reference: " + ref, { duration: 10000 });
                                      } finally {
                                        setVerificationLoading(false);
                                      }
                                    }, 0);
                                  },
                                  onClose: () => {
                                    setVerificationLoading(false);
                                    toast("Payment cancelled — tap the button again when you're ready.");
                                  },
                                });
                                handler.openIframe();
                              } catch (err: any) {
                                toast.error(err.message ?? "Payment error");
                                setVerificationLoading(false);
                              }
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors disabled:opacity-60">
                            {verificationLoading ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Processing...</> : <><ShieldCheck className="w-3.5 h-3.5" /> Pay GHS 50 to Get Verified</>}
                          </button>
                          <p className="text-[11px] text-muted-foreground mt-2">Make sure your payout details are saved in Settings before paying.</p>
                        </div>
                      </motion.div>
                    )}
                    {role === "seller" && isVerified && !isOfficial && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 rounded-2xl border border-green-500/30 bg-green-500/5">
                        <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <ShieldCheck className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                          <p className="font-display font-semibold text-sm text-green-700 dark:text-green-400">Verified Seller ✅</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {subaccountCode
                              ? "Buyers pay via Paystack split — 95% goes directly to your MoMo, settled next business day."
                              : "Your listings show the verified badge. Buyers pay via Paystack and funds transfer to you when you dispatch."}
                          </p>
                        </div>
                      </motion.div>
                    )}
                    {role === "seller" && !isOfficial && (() => {
                      const sellerReviews = reviews.filter(r => r.sellerId === (user?.id ?? ""));
                      const result  = getSellerStats(user?.id ?? "");
                      const average = result?.average ?? 0;
                      const count   = result?.count ?? 0;
                      return (
                        <div className="mt-8 pt-6 border-t border-border">
                          <div className="flex items-center justify-between mb-4">
                            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Buyer Reviews</p>
                            {count > 0 && (
                              <div className="flex items-center gap-1.5">
                                {[1,2,3,4,5].map(n => <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(average) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />)}
                                <span className="text-sm font-bold ml-1">{average}</span>
                                <span className="text-xs text-muted-foreground">/ 5 · {count} {count === 1 ? "review" : "reviews"}</span>
                              </div>
                            )}
                          </div>
                          {sellerReviews.length === 0 ? (
                            <div className="text-center py-10">
                              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3"><Star className="w-5 h-5 text-amber-400" /></div>
                              <p className="text-sm text-muted-foreground">No reviews yet. Complete orders to get rated by buyers.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <AnimatePresence>
                                {sellerReviews.map((review, i) => (
                                  <motion.div key={review.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }} className="rounded-xl border border-border p-4">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                          <span className="text-xs font-bold text-primary">{review.buyerName[0]}</span>
                                        </div>
                                        <p className="text-sm font-medium">{review.buyerName}</p>
                                      </div>
                                      <div className="flex items-center gap-0.5">
                                        {[1,2,3,4,5].map(n => <Star key={n} className={`w-3 h-3 ${n <= review.stars ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`} />)}
                                      </div>
                                    </div>
                                    {review.comment && <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>}
                                    <p className="text-[10px] text-muted-foreground mt-2">
                                      {new Date(review.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                                    </p>
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {activeTab === "orders" && isGuest && <GuestAuthBanner action="view or place orders" />}

            {/* Seller Orders */}
            {!isGuest && role === "seller" && activeTab === "orders" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-muted-foreground">{orders.length} {orders.length === 1 ? "order" : "orders"} received</p>
                </div>
                {orders.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><ShoppingBag className="w-5 h-5 text-primary" /></div>
                    <h3 className="font-display text-lg font-bold tracking-tight mb-2">No orders yet</h3>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">When buyers purchase your items, orders will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order, i) => (
                      <motion.div key={order.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }} className="rounded-2xl border border-border p-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-display font-bold text-sm">{formatOrderId(order.id)}</p>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[order.status]}`}>{order.status}</span>
                              {!order.seen && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">New</span>}
                              <PayoutBadge status={order.payoutStatus ?? "pending"} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(order.placedAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <p className="font-display font-bold text-base flex-shrink-0">GHS {order.total}</p>
                        </div>
                        <div className="space-y-2 mb-4">
                          {order.items.map(item => (
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
                        <div className="border-t border-border pt-4">
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">Confirmation</p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            {order.sellerConfirmed ? (
                              <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <span className="text-xs font-semibold text-green-600">You confirmed dispatch — payment sent</span>
                              </div>
                            ) : (
                              <button onClick={() => confirmAsSeller(order.id)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all text-sm font-semibold text-primary">
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
                          {order.sellerConfirmed && order.buyerConfirmed && (
                            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                              className="mt-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2">
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

            {/* Buyer Orders */}
            {!isGuest && role === "buyer" && activeTab === "orders" && (
              <div>
                {orders.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><ShoppingBag className="w-5 h-5 text-primary" /></div>
                    <h3 className="font-display text-lg font-bold tracking-tight mb-2">No orders yet</h3>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">Your purchase history will appear here.</p>
                    <Link to="/shop"><Button className="btn-primary rounded-full h-9 px-6 text-sm">Shop Now <ArrowRight className="ml-1.5 w-3.5 h-3.5" /></Button></Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-2">{orders.length} {orders.length === 1 ? "order" : "orders"} placed</p>
                    {orders.map((order, i) => (
                      <motion.div key={order.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }} className="rounded-2xl border border-border p-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-display font-bold text-sm">{formatOrderId(order.id)}</p>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[order.status]}`}>{order.status}</span>
                              <PayoutBadge status={order.payoutStatus ?? "pending"} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(order.placedAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <p className="font-display font-bold text-base flex-shrink-0">GHS {order.total}</p>
                        </div>
                        <div className="space-y-2 mb-4">
                          {order.items.map(item => (
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
                        <div className="border-t border-border pt-4">
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
                              <button onClick={() => order.sellerConfirmed && setRatingOrderId(order.id)}
                                disabled={!order.sellerConfirmed}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all
                                  ${order.sellerConfirmed
                                    ? "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary text-primary cursor-pointer"
                                    : "border-border bg-muted/20 text-muted-foreground cursor-not-allowed opacity-50"}`}>
                                <CheckCircle className="w-4 h-4" /> Confirm Receipt
                              </button>
                            )}
                          </div>
                          {order.sellerConfirmed && order.buyerConfirmed && (
                            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                              className="mt-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <p className="text-xs font-semibold text-green-600">Order complete — enjoy your sneakers! 🎉</p>
                            </motion.div>
                          )}
                          {order.sellerConfirmed && !order.buyerConfirmed && (
                            <div className="mt-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              <p className="text-xs text-muted-foreground">Order dispatched — confirm receipt once your sneakers arrive.</p>
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
              <RatingModal
                orderId={ratingOrderId}
                sellerId={orders.find(o => o.id === ratingOrderId)?.sellerId ?? ""}
                onClose={() => setRatingOrderId(null)}
                onConfirmed={() => confirmAsBuyer(ratingOrderId)}
              />
            )}

            {/* Seller Listings */}
            {!isGuest && role === "seller" && activeTab === "listings" && (
              <div>
                <AnimatePresence>
                  {showFirstListingBanner && <FirstListingBanner onDismiss={dismissFirstListingBanner} onStart={startFirstListing} />}
                </AnimatePresence>
                {isVerified && hasMissingPayoutDetails && !isOfficial && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-5 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Add payout details to receive payments</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Buyers pay via Paystack. Without payout details, your earnings will be held and transfers won't go through.
                      </p>
                      <button onClick={() => setActiveTab("settings")}
                        className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-amber-600 hover:opacity-70 transition-opacity">
                        <Wallet className="w-3 h-3" /> Add payout details in Settings →
                      </button>
                    </div>
                  </motion.div>
                )}
                <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                  <p className="text-sm text-muted-foreground">
                    <span className="text-foreground font-semibold">{listings.filter(l => l.status === "active").length}</span> active{" · "}
                    <span className="text-muted-foreground">{listings.filter(l => l.status === "sold").length} sold</span>
                  </p>
                  {listings.length > 0 && (
                    <Button className="btn-primary rounded-full h-9 px-5 text-sm flex-shrink-0" onClick={() => navigate("/listings/new")}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> New Listing
                    </Button>
                  )}
                </div>
                {listings.length === 0 && !showFirstListingBanner && <FirstListingEmptyState onStart={startFirstListing} />}
                {listings.length === 0 && showFirstListingBanner && (
                  <div className="text-center py-10 text-muted-foreground text-sm">Your listings will appear here once you create one.</div>
                )}
                <div className="space-y-3">
                  <AnimatePresence>
                    {listings.map((listing, i) => (
                      <motion.div key={listing.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20, scale: 0.97 }} transition={{ delay: i * 0.05 }}
                        className={`rounded-2xl border p-4 transition-colors group ${listing.status === "sold" ? "border-border opacity-60" : "border-border hover:border-primary/30 hover:bg-primary/5"}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {listing.image ? <img src={listing.image} alt={listing.name} className="w-full h-full object-contain p-1" /> : <span className="text-2xl">👟</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-display font-semibold text-sm truncate">{listing.name}</p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide
                                ${listing.status === "active" ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-muted text-muted-foreground border border-border"}`}>
                                {listing.status === "active" ? "Active" : "Sold"}
                              </span>
                              {listing.status === "active" && isBoostActive(listing) && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                  <Zap className="w-2.5 h-2.5" /> {listing.boostExpiresAt ? "Featured" : "Official · Always Featured"}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{listing.brand} · {listing.category}</p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="w-3 h-3" /> {listing.views} views</span>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Tag className="w-3 h-3" /> Sizes: {listing.sizes.join(", ")}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(listing.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          </div>
                          <p className="font-display font-bold text-base flex-shrink-0">GHS {listing.price}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-wrap">
                          <button onClick={() => navigate("/listings/new", { state: { listing } })}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-primary/10 hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground">
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                          {listing.status === "active" && !isBoostActive(listing) && (
                            <button onClick={() => setBoostingListing(listing)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs font-medium hover:bg-amber-500/15 transition-colors text-amber-600 dark:text-amber-400">
                              <Zap className="w-3 h-3" /> {listing.boostExpiresAt ? "Re-boost" : "Boost"} · GHS 5
                            </button>
                          )}
                          {listing.status === "active" && isBoostActive(listing) && listing.boostExpiresAt && (
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <Zap className="w-3 h-3 fill-current" />
                                {boostDaysLeft(listing) === 0 ? "Expires today" : boostDaysLeft(listing) === 1 ? "1 day left" : `${boostDaysLeft(listing)} days left`}
                              </span>
                              {boostDaysLeft(listing) <= 3 && (
                                <button onClick={() => setBoostingListing(listing)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-500/40 text-[10px] font-semibold text-amber-600 hover:bg-amber-500/15 transition-colors">
                                  Extend
                                </button>
                              )}
                            </div>
                          )}
                          {listing.status === "active" && isBoostActive(listing) && !listing.boostExpiresAt && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                              style={{ background: "rgba(109,40,217,0.1)", border: "1px solid rgba(109,40,217,0.25)", color: "#a78bfa" }}>
                              <Sparkles className="w-3 h-3" /> Official · Always Featured
                            </span>
                          )}
                          {listing.status === "active" && (
                            <button onClick={() => { markSold(listing.id); toast.success("Marked as sold"); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-green-500/10 hover:border-green-500/30 transition-colors text-muted-foreground hover:text-green-600">
                              <CheckCircle className="w-3 h-3" /> Mark Sold
                            </button>
                          )}
                          <button onClick={() => { deleteListing(listing.id); toast.success("Listing removed"); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-red-500/10 hover:border-red-500/30 transition-colors text-muted-foreground hover:text-red-500 ml-auto">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {boostingListing && <BoostModal listing={boostingListing} onClose={() => setBoostingListing(null)} />}
              </div>
            )}

            {/* Saved */}
            {activeTab === "saved" && (
              <div>
                {saved.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><Heart className="w-5 h-5 text-primary" /></div>
                    <h3 className="font-display text-lg font-bold tracking-tight mb-2">Nothing saved</h3>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">Save listings you like to find them later.</p>
                    <Link to="/shop"><Button className="btn-primary rounded-full h-9 px-6 text-sm">Browse <ArrowRight className="ml-1.5 w-3.5 h-3.5" /></Button></Link>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-sm text-muted-foreground">{saved.length} saved {saved.length === 1 ? "item" : "items"}</p>
                      <Link to="/shop"><Button variant="outline" className="rounded-full h-8 px-4 text-xs">Browse more <ArrowRight className="ml-1 w-3 h-3" /></Button></Link>
                    </div>
                    <div className="space-y-2">
                      <AnimatePresence>
                        {saved.map((item, i) => (
                          <motion.div key={item.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: 20, scale: 0.97 }} transition={{ delay: i * 0.05, duration: 0.2 }}
                            className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-border hover:bg-primary/5 transition-colors group">
                            <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden flex-shrink-0">
                              {item.image
                                ? <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
                                : <div className="w-full h-full bg-primary/10 flex items-center justify-center text-lg">👟</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              {item.brand && <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium mb-0.5">{item.brand}</p>}
                              <p className="font-medium text-sm truncate">{item.name}</p>
                              <p className="font-display font-bold text-sm text-primary mt-0.5">GHS {item.price.toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Link to={`/product/${item.id}`}>
                                <button className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-colors">
                                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                              </Link>
                              <button onClick={() => toggleSaved(item)}
                                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-red-500/10 hover:border-red-300 transition-colors">
                                <Heart className="w-3.5 h-3.5 text-red-400" fill="currentColor" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "analytics" && role === "seller" && !isGuest && <SellerDashboard />}
            {activeTab === "messages" && isGuest && <GuestAuthBanner action="view messages" />}
            {activeTab === "messages" && !isGuest && <MessagesInbox />}
            {activeTab === "settings" && isGuest && <GuestAuthBanner action="access settings" />}
            {activeTab === "settings" && !isGuest && (
              <div className="space-y-6 max-w-lg">
                <div className="rounded-2xl border border-border overflow-hidden">
                  <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/20">
                    <Bell className="w-4 h-4 text-primary" />
                    <p className="font-display font-semibold text-sm">Notifications</p>
                  </div>
                  <div className="divide-y divide-border">
                    <NotificationSettings pushSupported={pushSupported} pushPermission={pushPermission} requestPermission={requestPermission} />
                    {[
                      { label: "Order updates",  sub: "Confirmations, dispatch and delivery", key: "notif_orders",     value: notifOrders,     set: setNotifOrders },
                      { label: "Messages",       sub: "Replies from buyers or sellers",       key: "notif_messages",   value: notifMessages,   set: setNotifMessages },
                      { label: "Promotions",     sub: "Deals, new arrivals and boosts",       key: "notif_promotions", value: notifPromotions, set: setNotifPromotions },
                    ].map(({ label, sub, key, value, set }) => (
                      <div key={label} className="flex items-center justify-between px-5 py-4 gap-4">
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                        </div>
                        <button onClick={() => toggleNotif(key, !value, set)}
                          className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${value ? "bg-primary" : "bg-border"}`}>
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border overflow-hidden">
                  <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/20">
                    <Shield className="w-4 h-4 text-primary" />
                    <p className="font-display font-semibold text-sm">Privacy & Security</p>
                  </div>
                  <div className="divide-y divide-border">
                    <div className="px-5 py-4">
                      <button onClick={() => setShowChangePassword(!showChangePassword)} className="w-full flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <Lock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          <div className="text-left">
                            <p className="text-sm font-medium">Change password</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Update your account password</p>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showChangePassword ? "rotate-90" : ""}`} />
                      </button>
                      <AnimatePresence>
                        {showChangePassword && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="pt-4 space-y-3">
                              <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
                              <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
                              <Button className="btn-primary rounded-full h-9 px-5 text-sm" onClick={handleChangePassword}>Update Password</Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="px-5 py-4">
                      {!showDeleteConfirm ? (
                        <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center gap-3 group">
                          <Trash className="w-4 h-4 text-muted-foreground group-hover:text-red-500 transition-colors" />
                          <div className="text-left">
                            <p className="text-sm font-medium group-hover:text-red-500 transition-colors">Delete account</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Permanently remove your account and data</p>
                          </div>
                        </button>
                      ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                              <Trash className="w-4 h-4 text-red-500" />
                            </div>
                            <p className="text-sm font-bold text-red-500">Delete Account</p>
                          </div>
                          <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 space-y-2">
                            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">This will permanently delete:</p>
                            <div className="space-y-1.5 mt-2">
                              {["Your profile and personal information","All your active and past listings","Your saved items and preferences","Access to all your order history","Your messages and conversations"].map(item => (
                                <div key={item} className="flex items-start gap-2">
                                  <span className="text-red-400 text-xs mt-0.5 flex-shrink-0">✕</span>
                                  <p className="text-xs text-muted-foreground">{item}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">This action is <span className="font-semibold text-foreground">permanent and cannot be undone</span>.</p>
                          <div className="flex gap-2">
                            <button onClick={handleDeleteAccount}
                              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                              Yes, delete forever
                            </button>
                            <button onClick={() => setShowDeleteConfirm(false)}
                              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors">
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {role === "seller" && !isOfficial && (
                  <div className="rounded-2xl border border-border overflow-hidden">
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/20">
                      <Wallet className="w-4 h-4 text-primary" />
                      <p className="font-display font-semibold text-sm">Payout Details</p>
                    </div>
                    <div className="p-5 space-y-4">
                      {isVerified && hasMissingPayoutDetails && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          <p className="text-xs font-semibold text-amber-600">Required — your payouts are held until you add these details.</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Where should we send your earnings? We transfer automatically when you mark an order as dispatched.{" "}
                        <span className="font-semibold text-foreground">SneakersHub takes 5% commission</span> per sale.
                        {!isVerified && <span className="block mt-1 text-[11px]">Only applies when you become a verified seller.</span>}
                      </p>
                      <div>
                        <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-2">Payout Method</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {([
                            { value: "momo_mtn",         label: "MTN MoMo" },
                            { value: "momo_telecel",      label: "Telecel Cash" },
                            { value: "momo_airteltigo",   label: "AirtelTigo" },
                            { value: "bank",              label: "Bank Transfer" },
                          ] as const).map(({ value, label }) => (
                            <button key={value} onClick={() => setPayoutForm(p => ({ ...p, method: value, bankCode: "" }))}
                              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all text-xs font-semibold
                                ${payoutForm.method === value ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                              <CreditCard className={`w-4 h-4 ${payoutForm.method === value ? "text-primary" : ""}`} />
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                          {payoutForm.method === "bank" ? "Account Number" : "MoMo Number"}
                        </label>
                        <input value={payoutForm.number} onChange={e => setPayoutForm(p => ({ ...p, number: e.target.value }))}
                          placeholder={payoutForm.method === "bank" ? "0123456789" : "+233 24 000 0000"}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
                      </div>
                      {payoutForm.method === "bank" && (
                        <div>
                          <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">Select Bank</label>
                          <select value={payoutForm.bankCode} onChange={e => setPayoutForm(p => ({ ...p, bankCode: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary transition-all font-[inherit]">
                            <option value="">Choose your bank...</option>
                            <option value="030100">GCB Bank</option>
                            <option value="040100">Ecobank Ghana</option>
                            <option value="050100">Agricultural Development Bank</option>
                            <option value="060100">Fidelity Bank</option>
                            <option value="070101">Zenith Bank</option>
                            <option value="080100">Stanbic Bank</option>
                            <option value="090100">Standard Chartered</option>
                            <option value="100100">Absa Bank Ghana</option>
                            <option value="110100">Access Bank Ghana</option>
                            <option value="120100">CalBank</option>
                            <option value="130100">First Atlantic Bank</option>
                            <option value="140100">UBA Ghana</option>
                            <option value="150100">Republic Bank</option>
                            <option value="190100">Consolidated Bank Ghana</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">Account Name</label>
                        <input value={payoutForm.name} onChange={e => setPayoutForm(p => ({ ...p, name: e.target.value }))}
                          placeholder="Name on account"
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
                      </div>
                      <Button className="btn-primary rounded-full h-9 px-5 text-sm w-full"
                        onClick={async () => {
                          if (!payoutForm.method || !payoutForm.number || !payoutForm.name) { toast.error("Please fill in all payout details"); return; }
                          if (payoutForm.method === "bank" && !payoutForm.bankCode) { toast.error("Please select your bank"); return; }
                          try {
                            const { supabase } = await import("@/lib/supabase");
                            const { error } = await supabase.from("profiles").update({
                              payout_method: payoutForm.method, payout_number: payoutForm.number, payout_name: payoutForm.name, payout_bank_code: payoutForm.bankCode || null,
                            }).eq("id", user!.id);
                            if (error) throw error;
                            setPayoutSaved(true); toast.success("Payout details saved!"); setHasMissingPayoutDetails(false);
                            setTimeout(() => setPayoutSaved(false), 3000);
                          } catch (err: any) { toast.error(err.message ?? "Failed to save payout details"); }
                        }}>
                        {payoutSaved ? <><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Saved!</> : "Save Payout Details"}
                      </Button>
                    </div>
                  </div>
                )}
                <p className="text-center text-xs text-muted-foreground pb-4">SneakersHub v1.0 · Made in Ghana 🇬🇭</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
      <Footer />
    </div>
  );
};

export default Account;