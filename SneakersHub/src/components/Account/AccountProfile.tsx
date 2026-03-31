import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  User, MapPin, Store, Tag, Star, Pencil, CheckCircle,
  ArrowRight, LogOut, ShieldCheck, BadgeCheck, ChevronDown, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRatings } from "@/context/RatingContext";
import { fadeUp, itemVariant, IS_MOBILE } from "../Account/accountHelpers";

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

const AccountProfile = memo(({
  user, isGuest, role, isVerified, isOfficial, subaccountCode,
  verificationLoading, editMode, setEditMode, profileForm, setProfileForm,
  payoutForm, avatarUrl, reviews, onSaveProfile, onLogout, onVerify, onSetTab,
}: Props) => {
  const navigate = useNavigate();
  const { getSellerStats } = useRatings();

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : isGuest ? "G" : "?";

  if (isGuest) return (
    <div>
      <div className="rounded-2xl border border-border p-6 text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <User className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-display text-lg font-bold mb-1">You're browsing as a guest</h3>
        <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
          Create an account to buy, sell, track orders, and save your favourite items.
        </p>
        <Button className="btn-primary rounded-full h-9 px-6 text-sm" onClick={() => navigate("/auth")}>
          Sign In / Sign Up <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
        </Button>
      </div>
      <button onClick={onLogout} className="text-sm text-red-500 flex items-center gap-1.5 hover:opacity-70 transition-opacity">
        <LogOut className="w-3.5 h-3.5" /> Exit guest mode
      </button>
    </div>
  );

  const sellerReviews = reviews.filter((r: any) => r.sellerId === (user?.id ?? ""));
  const stats = getSellerStats(user?.id ?? "");
  const average = stats?.average ?? 0;
  const count = stats?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "Full Name", name: "name",  value: editMode ? profileForm.name : (user?.name ?? ""), placeholder: "Your name" },
          { label: "Email",     name: "email", value: user?.email ?? "", placeholder: "", disabled: true },
          { label: "Phone",     name: "phone", value: profileForm.phone, placeholder: "+233 24 000 0000" },
          { label: "City",      name: "city",  value: profileForm.city,  placeholder: "Kumasi" },
        ].map(({ label, name, value, placeholder, disabled }) => (
          <div key={name}>
            <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">{label}</label>
            <input
              value={value}
              onChange={e => setProfileForm((p: any) => ({ ...p, [name]: e.target.value }))}
              disabled={disabled || !editMode}
              placeholder={placeholder}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                disabled:opacity-50 disabled:cursor-not-allowed transition-all font-[inherit]"
            />
          </div>
        ))}

        {/* Region */}
        <div>
          <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
            Region {role === "seller" && editMode && <span className="text-red-400 normal-case tracking-normal font-normal text-[10px] ml-1">required</span>}
          </label>
          {editMode ? (
            <div className="relative">
              <select
                value={profileForm.region}
                onChange={e => setProfileForm((p: any) => ({ ...p, region: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                  focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit] appearance-none cursor-pointer"
              >
                <option value="">Select region</option>
                {ghanaRegions.map(r => <option key={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          ) : (
            <input
              value={profileForm.region || "Not set"}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all font-[inherit]"
            />
          )}
        </div>

        {/* Bio */}
        <div className="col-span-full">
          <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">Bio</label>
          <textarea
            value={profileForm.bio}
            onChange={e => setProfileForm((p: any) => ({ ...p, bio: e.target.value }))}
            disabled={!editMode}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
              focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
              disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-all font-[inherit]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        {editMode
          ? <Button className="btn-primary rounded-full h-9 px-6 text-sm" onClick={onSaveProfile}>
              Save Changes <CheckCircle className="ml-1.5 w-3.5 h-3.5" />
            </Button>
          : <Button variant="outline" className="rounded-full h-9 px-6 text-sm" onClick={() => setEditMode(true)}>
              <Pencil className="mr-1.5 w-3.5 h-3.5" /> Edit Profile
            </Button>
        }
        <button onClick={onLogout} className="text-sm text-red-500 flex items-center gap-1.5 hover:opacity-70 transition-opacity">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>

      {/* Verification banner — unverified seller */}
      {role === "seller" && !isVerified && (
        <motion.div {...fadeUp}
          className="flex items-start gap-4 p-5 rounded-2xl border border-green-500/30 bg-green-500/5">
          <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-green-500" />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-sm text-green-700 dark:text-green-400 mb-1">
              Get Verified — GHS 50 one-time fee
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Verified sellers get a ✅ badge, Paystack split payments, and significantly more sales.
            </p>
            <button
              disabled={verificationLoading}
              onClick={() => {
                if (!user?.email) return;
                if (!payoutForm.number?.trim()) {
                  onSetTab("settings");
                  return;
                }
                onVerify();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors disabled:opacity-60"
            >
              {verificationLoading
                ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                : <><ShieldCheck className="w-3.5 h-3.5" /> Pay GHS 50 to Get Verified</>
              }
            </button>
            <p className="text-[11px] text-muted-foreground mt-2">
              Make sure your payout details are saved in Settings before paying.
            </p>
          </div>
        </motion.div>
      )}

      {/* Verified confirmation */}
      {role === "seller" && isVerified && !isOfficial && (
        <motion.div {...fadeUp}
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

      {/* Reviews section — seller only */}
      {role === "seller" && !isOfficial && (
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Buyer Reviews</p>
            {count > 0 && (
              <div className="flex items-center gap-1.5">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(average) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                ))}
                <span className="text-sm font-bold ml-1">{average}</span>
                <span className="text-xs text-muted-foreground">/ 5 · {count} {count === 1 ? "review" : "reviews"}</span>
              </div>
            )}
          </div>
          {sellerReviews.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                <Star className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-sm text-muted-foreground">No reviews yet. Complete orders to get rated by buyers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {sellerReviews.map((review: any, i: number) => (
                  <motion.div key={review.id} {...itemVariant(i)}
                    className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{review.buyerName[0]}</span>
                        </div>
                        <p className="text-sm font-medium">{review.buyerName}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} className={`w-3 h-3 ${n <= review.stars ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`} />
                        ))}
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
      )}
    </div>
  );
});

AccountProfile.displayName = "AccountProfile";
export default AccountProfile;