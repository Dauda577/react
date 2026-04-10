// Payment transfers immediately when seller marks as sent
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  User, LayoutGrid, ShoppingBag, Heart, Settings,
  MapPin, Store, Tag, Star, BadgeCheck, Sparkles,
  Bell, MessageCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useSaved } from "@/context/SavedContext";
import { useOrders } from "@/context/OrderContext";
import { useAuth } from "@/context/AuthContext";
import { useListings, type Listing } from "@/context/ListingContext";
import { useRatings } from "@/context/RatingContext";
import { useMessages } from "@/context/MessageContext";
import { usePush } from "@/context/PushContext";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { fadeUp, IS_MOBILE } from "../components/Account/accountHelpers";

import AccountProfile  from "../components/Account/AccountProfile";
import AccountOrders   from "../components/Account/AccountOrders";

const AccountListings  = lazy(() => import("../components/Account/AccountListings"));
const AccountSaved     = lazy(() => import("../components/Account/AccountSaved"));
const AccountMessages  = lazy(() => import("../components/Account/AccountMessages"));
const AccountSettings  = lazy(() => import("../components/Account/AccountSettings"));

const FIRST_LISTING_BANNER_KEY  = "sneakershub-first-listing-dismissed";
const FIRST_LISTING_NOTIF_KEY   = "sneakershub-first-listing-notif-sent";

const sellerTabs = [
  { id: "profile",   label: "Profile",   icon: User },
  { id: "orders",    label: "Orders",    icon: ShoppingBag },
  { id: "listings",  label: "Listings",  icon: LayoutGrid },
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

const TabSkeleton = () => (
  <div className="space-y-4 py-4">
    {[1, 2, 3].map(i => (
      <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
    ))}
  </div>
);

const Account = () => {
  const { user, isGuest, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");

  const role    = user?.role ?? "buyer";
  const canSell = user?.isSeller ?? role === "seller";
  const tabs    = isGuest ? guestTabs : canSell ? sellerTabs : buyerTabs;

  const { saved, toggleSaved } = useSaved();
  const { orders, unseenCount, markOrdersSeen, confirmAsSeller, confirmAsBuyer, addTracking } = useOrders();
  const { listings, boostListing } = useListings();
  const { hasReviewed, reviews, fetchReviews } = useRatings();
  const { totalUnread } = useMessages();
  const { requestPermission, isSupported: pushSupported, permission: pushPermission, showLocalNotification } = usePush();

  // Orders badge — persists until both sides confirm for sellers, or buyer confirms for buyers
  const incompleteOrdersCount = canSell
    ? orders.filter(o => o.sellerId === user?.id && !(o.sellerConfirmed && o.buyerConfirmed)).length
    : orders.filter(o => o.buyerId === user?.id && !o.buyerConfirmed).length;

  const [profileLoaded,   setProfileLoaded]   = useState(false);
  const [editMode,        setEditMode]        = useState(false);
  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(null);
  const [isVerified,      setIsVerified]      = useState(false);
  const [isOfficial,      setIsOfficial]      = useState(false);
  const [subaccountCode,  setSubaccountCode]  = useState<string | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [hasMissingPayoutDetails, setHasMissingPayoutDetails] = useState(false);
  const [totalListingsCreated, setTotalListingsCreated] = useState(0);
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "Guest",
    phone: "", city: "", region: "",
    bio: isGuest
      ? "Browsing as guest."
      : role === "seller"
        ? "Trusted seller based in Kumasi. Quality items, fair prices."
        : "Fashion enthusiast based in Kumasi.",
  });
  const [payoutForm, setPayoutForm] = useState({ method: "", number: "", name: "", bankCode: "" });

  const [boostingListing,       setBoostingListing]       = useState<Listing | null>(null);
  const [showFirstListingBanner, setShowFirstListingBanner] = useState(false);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [savingTracking, setSavingTracking] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user?.id) return;

    const CACHE_KEY = `profile_cache_${user.id}`;

    const applyProfileData = (p: any) => {
      setIsVerified(p.verified ?? false);
      setIsOfficial(p.is_official ?? false);
      setSubaccountCode(p.subaccount_code ?? null);
      setProfileForm(prev => ({
        ...prev,
        name:   p.name   ?? prev.name,
        phone:  p.phone  ?? "",
        city:   p.city   ?? "",
        region: p.region ?? "",
      }));
      if (p.avatar_url) setAvatarUrl(p.avatar_url);
      if (p.payout_method) {
        setPayoutForm({
          method:   p.payout_method,
          number:   p.payout_number ?? "",
          name:     p.payout_name   ?? "",
          bankCode: "",
        });
      }
      if (p.role === "seller") setTotalListingsCreated(p.listing_count ?? 0);
    };

    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        applyProfileData(JSON.parse(cached));
        setProfileLoaded(true);
      }
    } catch { /* sessionStorage unavailable */ }

    supabase
      .from("profiles")
      .select("name, phone, city, region, verified, is_official, subaccount_code, payout_method, payout_number, payout_name, listing_count, role, avatar_url")
      .eq("id", user.id)
      .single()
      .then(async ({ data }) => {
        if (!data) return;
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
        applyProfileData(data);

        if (!data.avatar_url) {
          supabase.auth.getUser().then(({ data: authData }) => {
            const metaPhoto =
              authData?.user?.user_metadata?.avatar_url ??
              authData?.user?.user_metadata?.picture ??
              null;
            if (metaPhoto) setAvatarUrl(metaPhoto);
          });
        }

        if (data.verified && (!data.payout_method || !data.payout_number)) {
          const { data: application } = await supabase
            .from("seller_applications")
            .select("momo_number")
            .eq("user_id", user.id)
            .in("status", ["pending", "approved"])
            .maybeSingle();
          if (!application?.momo_number) setHasMissingPayoutDetails(true);
        }

        setProfileLoaded(true);
      });
  }, [user?.id]);

  useEffect(() => {
    if (role === "seller" && activeTab === "orders") markOrdersSeen();
  }, [role, activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && ["profile","orders","listings","messages","settings"].includes(tab)) {
      setActiveTab(tab);
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

  useEffect(() => {
    if (role !== "seller" || isGuest) return;
    const dismissed = localStorage.getItem(FIRST_LISTING_BANNER_KEY);
    if (!dismissed && listings.length === 0) {
      setShowFirstListingBanner(true);
      const notifSent = localStorage.getItem(FIRST_LISTING_NOTIF_KEY);
      if (!notifSent && (window as any)?.Notification?.permission === "granted") {
        setTimeout(() => {
          showLocalNotification("Ready to start selling?", "Create your first listing — it takes less than 2 minutes!", "/account");
          localStorage.setItem(FIRST_LISTING_NOTIF_KEY, "true");
        }, 3000);
      }
    }
  }, [role, isGuest, listings.length]);

  const handleLogout = useCallback(async () => {
    if (user?.id) {
      try { sessionStorage.removeItem(`profile_cache_${user.id}`); } catch { /* ignore */ }
    }
    await logout();
    navigate("/");
  }, [logout, navigate, user?.id]);

  const handleSaveProfile = useCallback(async () => {
    if (!user) return;
    if (role === "seller" && !profileForm.region) {
      toast.error("Please select your region — buyers need to know where you ship from"); return;
    }
    try {
      const { error } = await supabase.from("profiles").update({
        name: profileForm.name, phone: profileForm.phone || null,
        city: profileForm.city || null, region: profileForm.region || null,
      }).eq("id", user.id);
      if (error) throw error;
      try { sessionStorage.removeItem(`profile_cache_${user.id}`); } catch { /* ignore */ }
      setEditMode(false);
      toast.success("Profile updated!");
    } catch (err: any) { toast.error(err.message ?? "Failed to save profile"); }
  }, [user, role, profileForm]);

  const handleVerify = useCallback(async () => {
    if (!user?.email || !payoutForm.number?.trim()) {
      toast.error("Please save your payout details in Settings first."); return;
    }
  }, [user?.email, payoutForm.number]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { user_id: user.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || !data?.success) {
        toast.error("Failed to delete account. Please contact support.");
        return;
      }
      try { sessionStorage.removeItem(`profile_cache_${user.id}`); } catch { /* ignore */ }
      await supabase.auth.signOut();
      toast.success("Account deleted.");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete account");
    }
  }, [user?.id, navigate]);

  const totalUnreadCount = (user ? totalUnread : 0);
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : isGuest ? "G" : "?";

  const sellerOrders = orders.filter(o => o.sellerId === user?.id);
  const buyerOrders  = orders.filter(o => o.buyerId  === user?.id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section
        className="relative pt-16 border-b border-border"
        style={{ paddingTop: `calc(64px + env(safe-area-inset-top, 0px))` }}
      >
        <div className="section-padding max-w-4xl mx-auto pt-14 pb-0">
          <motion.div {...(IS_MOBILE ? { initial: { opacity: 0 }, animate: { opacity: 1 } } : fadeUp)}
            className="flex items-center gap-5 pb-8">

            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {avatarUrl
                  ? <img src={avatarUrl} alt={user?.name ?? "avatar"} className="w-full h-full object-cover" />
                  : <span className="font-display text-xl font-bold text-primary">{initials}</span>
                }
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

                {!isGuest && role === "seller" && profileLoaded && (
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
                {isGuest ? "Ghana" : [profileForm.city, profileForm.region].filter(Boolean).join(", ") || "Ghana"}
              </p>
            </div>

            {!isGuest && (
              <Button
                onClick={() => { setActiveTab("profile"); setEditMode(e => !e); }}
                variant="outline" className="rounded-full h-9 px-5 text-sm hidden sm:flex"
              >
                {editMode ? "Done" : "Edit"}
              </Button>
            )}
          </motion.div>

          {/* Tabs */}
          <div className="flex overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 flex-1 sm:flex-none
                  px-3 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200
                  ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <tab.icon className="w-5 h-5 sm:w-4 sm:h-4" />
                <span>{tab.label}</span>

                {/* Orders badge — persists until both sides confirm */}
                {tab.id === "orders" && incompleteOrdersCount > 0 && (
                  <span className="absolute top-2 right-2 sm:static sm:ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {incompleteOrdersCount}
                  </span>
                )}

                {tab.id === "saved" && saved.length > 0 && (
                  <span className="absolute top-2 right-2 sm:static sm:ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {saved.length}
                  </span>
                )}
                {tab.id === "messages" && totalUnreadCount > 0 && (
                  <span className="absolute top-2 right-2 sm:static sm:ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding max-w-4xl mx-auto py-10">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} {...fadeUp}>
            <Suspense fallback={<TabSkeleton />}>

              {activeTab === "profile" && (
                <AccountProfile
                  user={user} isGuest={isGuest} role={role}
                  isVerified={isVerified} isOfficial={isOfficial}
                  subaccountCode={subaccountCode}
                  verificationLoading={verificationLoading}
                  editMode={editMode} setEditMode={setEditMode}
                  profileForm={profileForm} setProfileForm={setProfileForm}
                  payoutForm={payoutForm} avatarUrl={avatarUrl}
                  reviews={reviews}
                  onSaveProfile={handleSaveProfile}
                  onLogout={handleLogout}
                  onVerify={handleVerify}
                  onSetTab={setActiveTab}
                />
              )}

              {activeTab === "orders" && (
                <AccountOrders
                  isGuest={isGuest} canSell={canSell}
                  sellerOrders={sellerOrders}
                  buyerOrders={buyerOrders}
                  isVerified={isVerified} isOfficial={isOfficial}
                  trackingInputs={trackingInputs} setTrackingInputs={setTrackingInputs}
                  savingTracking={savingTracking} setSavingTracking={setSavingTracking}
                  confirmAsSeller={confirmAsSeller} confirmAsBuyer={confirmAsBuyer}
                  addTracking={addTracking} hasReviewed={hasReviewed}
                />
              )}

              {activeTab === "listings" && canSell && !isGuest && (
                <AccountListings
                  listings={listings} isVerified={isVerified} isOfficial={isOfficial}
                  totalListingsCreated={totalListingsCreated}
                  hasMissingPayoutDetails={hasMissingPayoutDetails}
                  showFirstListingBanner={showFirstListingBanner}
                  setShowFirstListingBanner={setShowFirstListingBanner}
                  onSetTab={setActiveTab}
                  boostingListing={boostingListing}
                  setBoostingListing={setBoostingListing}
                />
              )}

              {activeTab === "saved" && <AccountSaved saved={saved} toggleSaved={toggleSaved} />}

              {activeTab === "messages" && (isGuest ? <GuestAuthBanner action="view messages" /> : <AccountMessages />)}

              {activeTab === "settings" && (
                isGuest
                  ? <GuestAuthBanner action="access settings" />
                  : <AccountSettings
                      user={user} canSell={canSell} isOfficial={isOfficial}
                      isVerified={isVerified} subaccountCode={subaccountCode}
                      hasMissingPayoutDetails={hasMissingPayoutDetails}
                      pushSupported={pushSupported} pushPermission={pushPermission}
                      requestPermission={requestPermission}
                      onDeleteAccount={handleDeleteAccount}
                    />
              )}

            </Suspense>
          </motion.div>
        </AnimatePresence>
      </section>

      <Footer />
    </div>
  );
};

export default Account;