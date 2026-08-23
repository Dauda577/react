"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate, NavLink } from "@/lib/router";
import {
  User, LayoutGrid, Heart, Settings,
  MapPin, Store, BadgeCheck, Sparkles, BarChart2, LogOut,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import AdminLink from "@/components/admin/AdminLink";
import { Button } from "@/components/ui/button";
import { useSaved } from "@/context/SavedContext";
import { useAuth } from "@/context/AuthContext";
import { ProfileProvider, useProfile } from "@/context/ProfileContext";

const tabs = [
  { id: "profile",   label: "Profile",   icon: User,       to: "/account/profile" },
  { id: "listings",  label: "Listings",  icon: LayoutGrid, to: "/account/listings" },
  { id: "saved",     label: "Saved",     icon: Heart,      to: "/account/saved" },
  { id: "analytics", label: "Analytics", icon: BarChart2,  to: "/account/analytics" },
  { id: "settings",  label: "Settings",  icon: Settings,   to: "/account/settings" },
];

const guestTabs = [
  { id: "profile", label: "Profile", icon: User,  to: "/account/profile" },
  { id: "saved",   label: "Saved",   icon: Heart, to: "/account/saved" },
];

export const GuestAuthBanner = ({ action }: { action: string }) => {
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

const LogoutConfirm = ({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
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
                onClick={() => {
                  onClose();
                  onConfirm();
                }}
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

const AccountSidebar = () => {
  const { user, isGuest } = useAuth();
  const { saved } = useSaved();
  const { isVerified, isOfficial, profileForm, avatarUrl, editMode, setEditMode, handleLogout } =
    useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const activeTabs = isGuest ? guestTabs : tabs;

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : isGuest
      ? "G"
      : "?";

  const isActive = (to: string) => location.pathname === to;

  return (
    <>
      <aside className="lg:sticky lg:top-24">
        <div className="rounded-2xl border border-border overflow-hidden bg-background">
          {/* Profile card */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="relative w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt={user?.name ?? "avatar"} fill sizes="56px" className="object-cover" />
                  ) : (
                    <span className="font-display text-lg font-bold text-primary">{initials}</span>
                  )}
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
                {!isGuest && (
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
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                  ${isGuest
                    ? "bg-muted text-muted-foreground border border-border"
                    : "bg-primary/10 text-primary border border-primary/20"}`}
              >
                {isGuest ? (
                  <>
                    <User className="w-3 h-3" /> Guest
                  </>
                ) : (
                  <>
                    <Store className="w-3 h-3" /> Member
                  </>
                )}
              </span>
              {!isGuest && (
                <Button
                  onClick={() => {
                    setEditMode((e: boolean) => !e);
                    navigate("/account/profile");
                  }}
                  variant="outline"
                  className="rounded-full h-8 px-4 text-xs ml-auto"
                >
                  {editMode ? "Done" : "Edit"}
                </Button>
              )}
            </div>
          </div>

          {/* Vertical nav */}
          <nav className="p-3 flex flex-col gap-1">
            {activeTabs.map((tab) => (
              <NavLink
                key={tab.id}
                to={tab.to}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${isActive(tab.to)
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
              </NavLink>
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

      <LogoutConfirm
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
    </>
  );
};

const AccountShell = ({ children }: { children: ReactNode }) => (
  <ProfileProvider>
    <div className="min-h-screen bg-background">
      <Navbar />

      <section
        className="section-padding"
        style={{ paddingTop: `calc(64px + env(safe-area-inset-top, 0px))` }}
      >
        <div className="pt-12 pb-10">
          <AdminLink />

          <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-10 lg:items-start">
            <AccountSidebar />

            <section className="mt-6 lg:mt-0">{children}</section>
          </div>
        </div>
      </section>
    </div>
  </ProfileProvider>
);

export default AccountShell;