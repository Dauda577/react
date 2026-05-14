import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  User, LayoutGrid, Heart, Settings,
  MapPin, Store, BadgeCheck, Sparkles, BarChart2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useSaved } from "@/context/SavedContext";
import { useAuth } from "@/context/AuthContext";
import { useListings, type Listing } from "@/context/ListingContext";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { fadeUp, itemVariant } from "../components/Account/accountHelpers";

import AdminLink from "@/components/admin/AdminLink";
import AccountProfile from "../components/Account/AccountProfile";
import AccountAnalytics from "../components/Account/AccountAnalytics";

const AccountListings = lazy(() => import("../components/Account/AccountListings"));
const AccountSaved = lazy(() => import("../components/Account/AccountSaved"));
const AccountSettings = lazy(() => import("../components/Account/AccountSettings"));

const tabs = [
  { id: "profile",   label: "Profile",   icon: User },
  { id: "listings",  label: "Listings",  icon: LayoutGrid },
  { id: "saved",     label: "Saved",     icon: Heart },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "settings",  label: "Settings",  icon: Settings },
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

  const { saved, toggleSaved } = useSaved();
  const { listings, boostListing } = useListings();

  const [profileLoaded, setProfileLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isOfficial, setIsOfficial] = useState(false);
  const [totalListingsCreated, setTotalListingsCreated] = useState(0);
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "Guest",
    phone: "", city: "", region: "",
  });

  const [boostingListing, setBoostingListing] = useState<Listing | null>(null);
  const [showFirstListingBanner, setShowFirstListingBanner] = useState(false);

  const FIRST_LISTING_BANNER_KEY = "classifieds-first-listing-dismissed";

  const activeTabs = isGuest ? guestTabs : tabs;

  useEffect(() => {
    if (!user?.id) return;
    const CACHE_KEY = `profile_cache_${user.id}`;

    const applyProfileData = (p: any) => {
      setIsVerified(p.verified ?? false);
      setIsOfficial(p.is_official ?? false);
      setProfileForm(prev => ({
        ...prev,
        name: p.name ?? prev.name,
        phone: p.phone ?? "",
        city: p.city ?? "",
        region: p.region ?? "",
      }));
      if (p.avatar_url) setAvatarUrl(p.avatar_url);
      setTotalListingsCreated(p.listing_count ?? 0);
    };

    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) { applyProfileData(JSON.parse(cached)); setProfileLoaded(true); }
    } catch { /* sessionStorage unavailable */ }

    supabase
      .from("profiles")
      .select("name, phone, city, region, verified, is_official, listing_count, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
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

        setProfileLoaded(true);
      });
  }, [user?.id]);

  // Deep-link to tab via ?tab=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && activeTabs.some(t => t.id === tab)) {
      setActiveTab(tab);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Boost success redirect from Paystack
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const boostListingId = params.get("boost_success");
    if (!boostListingId || !user?.id) return;
    window.history.replaceState({}, "", window.location.pathname);
    boostListing(boostListingId)
      .then(() => { toast.success("🎉 Listing boosted! Featured for 10 days."); setActiveTab("listings"); })
      .catch(() => toast.error("Payment received but boost failed. Contact support."));
  }, [user?.id]);

  // First listing banner
  useEffect(() => {
    if (isGuest) return;
    const dismissed = localStorage.getItem(FIRST_LISTING_BANNER_KEY);
    if (!dismissed && listings.length === 0) setShowFirstListingBanner(true);
  }, [isGuest, listings.length]);

  const handleLogout = useCallback(async () => {
    if (user?.id) {
      try { sessionStorage.removeItem(`profile_cache_${user.id}`); } catch { /* ignore */ }
    }
    await logout();
    navigate("/");
  }, [logout, navigate, user?.id]);

  const handleSaveProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { error } = await supabase.from("profiles").update({
        name: profileForm.name,
        phone: profileForm.phone || null,
        city: profileForm.city || null,
        region: profileForm.region || null,
      }).eq("id", user.id);
      if (error) throw error;
      try { sessionStorage.removeItem(`profile_cache_${user.id}`); } catch { /* ignore */ }
      setEditMode(false);
      toast.success("Profile updated!");
    } catch (err: any) { toast.error(err.message ?? "Failed to save profile"); }
  }, [user, profileForm]);

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
    } catch (err: any) { toast.error(err.message ?? "Failed to delete account"); }
  }, [user?.id, navigate]);

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : isGuest ? "G" : "?";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section
        className="relative pt-16 border-b border-border"
        style={{ paddingTop: `calc(64px + env(safe-area-inset-top, 0px))` }}
      >
        <div className="section-padding max-w-4xl mx-auto pt-14 pb-0">
          <AdminLink />

          <motion.div {...fadeUp} className="flex items-center gap-5 pb-8">
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
                  ${isGuest
                    ? "bg-muted text-muted-foreground border border-border"
                    : "bg-primary/10 text-primary border border-primary/20"}`}>
                  {isGuest
                    ? <><User className="w-3 h-3" /> Guest</>
                    : <><Store className="w-3 h-3" /> Member</>}
                </div>

                {!isGuest && profileLoaded && (
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
            {activeTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 flex-1 sm:flex-none
                  px-3 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200
                  ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <tab.icon className="w-5 h-5 sm:w-4 sm:h-4" />
                <span>{tab.label}</span>
                {tab.id === "saved" && saved.length > 0 && (
                  <span className="absolute top-2 right-2 sm:static sm:ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {saved.length}
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
                  user={user} isGuest={isGuest}
                  isVerified={isVerified} isOfficial={isOfficial}
                  editMode={editMode} setEditMode={setEditMode}
                  profileForm={profileForm} setProfileForm={setProfileForm}
                  avatarUrl={avatarUrl}
                  onSaveProfile={handleSaveProfile}
                  onLogout={handleLogout}
                />
              )}

              {activeTab === "listings" && !isGuest && (
                <AccountListings
                  listings={listings}
                  isVerified={isVerified} isOfficial={isOfficial}
                  totalListingsCreated={totalListingsCreated}
                  showFirstListingBanner={showFirstListingBanner}
                  setShowFirstListingBanner={setShowFirstListingBanner}
                  boostingListing={boostingListing}
                  setBoostingListing={setBoostingListing}
                />
              )}

              {activeTab === "saved" && (
                <AccountSaved saved={saved} toggleSaved={toggleSaved} />
              )}

              {activeTab === "analytics" && (
                isGuest ? <GuestAuthBanner action="view analytics" /> : <AccountAnalytics />
              )}

              {activeTab === "settings" && (
                isGuest
                  ? <GuestAuthBanner action="access settings" />
                  : <AccountSettings
                    user={user}
                    isOfficial={isOfficial}
                    isVerified={isVerified}
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