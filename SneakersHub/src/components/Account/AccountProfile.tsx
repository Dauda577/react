import React, { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  User,
  MapPin,
  Store,
  Tag,
  Star,
  Pencil,
  CheckCircle,
  ArrowRight,
  LogOut,
  ShieldCheck,
  BadgeCheck,
  ChevronDown,
  Sparkles,
  Mail,
  Phone,
  Map,
  Award,
  TrendingUp,
  Users,
  X,
  Wallet,
  AlertTriangle,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRatings } from "@/context/RatingContext";
import { fadeUp, itemVariant, IS_MOBILE } from "../Account/accountHelpers";
import { toast } from "sonner";
import { useOrders } from "@/context/OrderContext";
import { useListings } from "@/context/ListingContext";

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

// Stats Card Component
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

  // Calculate real stats from orders and listings
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
      {/* Simple Profile Header - removed avatar edit button and member since */}
      <div className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-display text-xl font-bold shadow-lg flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={user?.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold tracking-tight">{user?.name || "User"}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" /> {user?.email}
            </span>
            {user?.phone && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" /> {user.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row for Sellers - WITH REAL DATA */}
      {role === "seller" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard 
            icon={TrendingUp} 
            label="Total Sales" 
            value={`GHS ${totalSales.toLocaleString()}`} 
            accent="bg-green-500/10 text-green-500" 
          />
          <StatCard 
            icon={ShoppingBag} 
            label="Orders" 
            value={orderCount.toString()} 
            accent="bg-blue-500/10 text-blue-500" 
          />
          <StatCard 
            icon={Star} 
            label="Rating" 
            value={count > 0 ? `${average.toFixed(1)} (${count})` : "No reviews"} 
            accent="bg-amber-500/10 text-amber-500" 
          />
          <StatCard 
            icon={Store} 
            label="Listings" 
            value={`${activeListings}/${totalListings}`} 
            accent="bg-purple-500/10 text-purple-500" 
          />
        </div>
      )}

      {/* Profile Form */}
      <div className="rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-base font-bold flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Profile Information
          </h3>
          {!editMode && (
            <button 
              onClick={() => setEditMode(true)} 
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name */}
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

          {/* Email (read-only) */}
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

          {/* Phone */}
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

          {/* City */}
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

          {/* Region */}
          <div>
            <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
              Region {role === "seller" && <span className="text-red-400 text-[10px] normal-case">*</span>}
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

          {/* Bio (full width) */}
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

        {/* Profile Completion Warning */}
        {!hasCompleteProfile && editMode && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-600">
              Please complete your profile (name, phone, and region) to continue.
            </p>
          </div>
        )}

        {/* Action Buttons */}
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
              <Button 
                variant="outline" 
                className="rounded-full h-9 px-6 text-sm" 
                onClick={() => setEditMode(false)}
              >
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

      {/* Verification banner — unverified seller */}
      {role === "seller" && !isVerified && !isOfficial && (
        <motion.div {...fadeUp}
          className="flex items-start gap-4 p-5 rounded-2xl border border-green-500/30 bg-gradient-to-r from-green-500/5 to-transparent">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-base text-green-700 dark:text-green-400 mb-1">
              Get Verified — GHS 50 one-time fee
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
                  : <><ShieldCheck className="w-4 h-4" /> Pay GHS 50 to Get Verified</>
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

      {/* Verified confirmation */}
      {role === "seller" && isVerified && !isOfficial && (
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

      {/* Official seller confirmation */}
      {role === "seller" && isOfficial && (
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

      {/* Reviews section — all sellers (verified and official) */}
      {role === "seller" && (
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
                  {[1,2,3,4,5].map(n => (
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
                        {[1,2,3,4,5].map(n => (
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

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
                    onClick={() => {
                      setShowLogoutConfirm(false);
                      onLogout();
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
    </div>
  );
});

AccountProfile.displayName = "AccountProfile";
export default AccountProfile;