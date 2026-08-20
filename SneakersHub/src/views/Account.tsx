"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@/lib/router";
import {
  User, LayoutGrid, Heart, Settings,
  MapPin, Store, BadgeCheck, Sparkles, BarChart2, LogOut,
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

const LogoutConfirm = ({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
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
              Are you sure you want to sign out?
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => { onClose(); onConfirm(); }}
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
);

const Account = () => {
  const { user, isGuest, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
    phone: "", city: "", region: "", bio: "",
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
        className="section-padding max-w-5xl mx-auto"
        style={{ paddingTop: `calc(64px + env(safe-area-inset-top, 0px))` }}
      >
        <div className="pt-12 pb-10">
          <AdminLink />

          <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-10 lg:items-start">

            {/* ── Sidebar ── */}
            <aside className="lg:sticky lg:top-24">
              <div className="rounded-2xl border border-border overflow-hidden bg-background">

                {/* Profile card */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <div className="relative w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {avatarUrl
                          ? <Image src={avatarUrl} alt={user?.name ?? "avatar"} fill sizes="56px" className="object-cover" />
                          : <span className="font-display text-lg font-bold text-primary">{initials}</span>
                        }
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="font-display text-lg font-bold tracking-tight truncate">
                        {isGuest ? "Guest" : profileForm.name || user?.name || "User"}
                      </h1>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="truncate">
                          {isGuest ? "Ghana" : [profileForm.city, profileForm.region].filter(Boolean).join(", ") || "Ghana"}
                        </span>
                      </p>
                      {!isGuest && profileLoaded && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {isOfficial && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-violet-500/40 bg-gradient-to-r from-violet-700 to-indigo-800 text-violet-200">
                              <Sparkles className="w-2.5 h-2.5" /> Official
                            </span>
                          )}
                          {!isOfficial && isVerified && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-green-600 bg-green-500/10 border border-green-500/20">
                              <BadgeCheck className="w-2.5 h-2.5" /> Verified
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                      ${isGuest
                        ? "bg-muted text-muted-foreground border border-border"
                        : "bg-primary/10 text-primary border border-primary/20"}`}>
                      {isGuest
                        ? <><User className="w-3 h-3" /> Guest</>
                        : <><Store className="w-3 h-3" /> Member</>}
                    </span>
                    {!isGuest && (
                      <Button
                        onClick={() => { setActiveTab("profile"); setEditMode(e => !e); }}
                        variant="outline" className="rounded-full h-8 px-4 text-xs ml-auto"
                      >
                        {editMode ? "Done" : "Edit"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Vertical nav */}
                <nav className="p-3 flex flex-col gap-1">
                  {activeTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all
                        ${activeTab === tab.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"}`}
                    >
                      <tab.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left">{tab.label}</span>
                      {tab.id === "saved" && saved.length > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                          {saved.length}
                        </span>
                      )}
                    </button>
                  ))}

                  <div className="border-t border-border mt-2 pt-2">
                    <button
                      onClick={() => setShowLogoutConfirm(true)}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all"
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left">Sign out</span>
                    </button>
                  </div>
                </nav>
              </div>
            </aside>

            {/* ── Content ── */}
            <section className="mt-6 lg:mt-0">
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} {...fadeUp}>
                  <Suspense fallback={<TabSkeleton />}>

                    {activeTab === "profile" && (
                      <AccountProfile
                        user={user} isGuest={isGuest}
                        role={user?.role ?? "buyer"} verificationLoading={false}
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
                          onDeleteAccount={handleDeleteAccount}
                        />
                    )}

                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </section>

          </div>
        </div>
      </section>

      <Footer />

      <LogoutConfirm
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
};

export default Account;