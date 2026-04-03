import React, { memo, lazy, Suspense, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Store, Plus, Eye, Tag, Pencil, Trash2, Zap, Sparkles,
  AlertTriangle, Wallet, X, Camera, Type, DollarSign, Ruler, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListings, boostDaysLeft, isBoostActive, type Listing } from "@/context/ListingContext";
import { CATEGORY_SVGS } from "@/data/sneakers";
import { itemVariant, fadeUp } from "../Account/accountHelpers";
import { toast } from "sonner";

const BoostModal = lazy(() => import("@/components/BoostModal"));

const FIRST_LISTING_BANNER_KEY = "sneakershub-first-listing-dismissed";

// ── First listing banner ──────────────────────────────────────────────────────
const FirstListingBanner = ({ onDismiss, onStart }: { onDismiss: () => void; onStart: () => void }) => (
  <motion.div {...fadeUp}
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
        { icon: Camera,     label: "A photo",      sub: "Clear, well-lit shot" },
        { icon: Type,       label: "Name & brand", sub: "e.g. Nike Air Max" },
        { icon: DollarSign, label: "Your price",   sub: "In GHS" },
        { icon: Ruler,      label: "Sizes",        sub: "Where applicable" },
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
    <motion.div {...fadeUp}
      className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
      <Store className="w-7 h-7 text-primary" />
    </motion.div>
    <h3 className="font-display text-xl font-bold tracking-tight mb-2">Start selling today</h3>
    <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-8">
      List your items in minutes and reach buyers across Ghana.
    </p>
    <div className="max-w-sm mx-auto mb-8 space-y-3 text-left">
      {[
        { step: "1", title: "Take a clear photo",        desc: "Natural light works best." },
        { step: "2", title: "Add details & price",       desc: "Brand, name, condition, sizes, and your asking price." },
        { step: "3", title: "Publish & wait for buyers", desc: "Your listing goes live instantly. Boost it to get seen faster." },
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

interface Props {
  listings: Listing[];
  isVerified: boolean;
  isOfficial: boolean;
  totalListingsCreated: number;
  hasMissingPayoutDetails: boolean;
  showFirstListingBanner: boolean;
  setShowFirstListingBanner: (v: boolean) => void;
  onSetTab: (tab: string) => void;
  boostingListing: Listing | null;
  setBoostingListing: (l: Listing | null) => void;
}

const AccountListings = memo(({
  listings, isVerified, isOfficial, totalListingsCreated, hasMissingPayoutDetails,
  showFirstListingBanner, setShowFirstListingBanner, onSetTab,
  boostingListing, setBoostingListing,
}: Props) => {
  const navigate = useNavigate();
  const { deleteListing } = useListings();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredListings = listings.filter((listing) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [listing.name, listing.brand, listing.category, listing.status]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(q));
  });

  const dismissBanner = () => {
    setShowFirstListingBanner(false);
    localStorage.setItem(FIRST_LISTING_BANNER_KEY, "true");
  };

  const startListing = () => {
    dismissBanner();
    navigate("/listings/new");
  };

  return (
    <div>
      <AnimatePresence>
        {showFirstListingBanner && (
          <FirstListingBanner onDismiss={dismissBanner} onStart={startListing} />
        )}
      </AnimatePresence>

      {/* Missing payout details warning */}
      {isVerified && hasMissingPayoutDetails && !isOfficial && (
        <motion.div {...fadeUp}
          className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Add payout details to receive payments</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Buyers pay via Paystack. Add your MoMo or bank details so your earnings can be paid out correctly.
            </p>
            <button onClick={() => onSetTab("settings")}
              className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-amber-600 hover:opacity-70 transition-opacity">
              <Wallet className="w-3 h-3" /> Add payout details in Settings →
            </button>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-semibold">{filteredListings.filter(l => l.status === "active").length}</span> active{" · "}
            <span className="text-muted-foreground">{filteredListings.filter(l => l.status === "sold").length} sold</span>
          </p>
          {!isVerified && !isOfficial && (
            <p className="text-xs text-muted-foreground mt-1">
              {totalListingsCreated}/20 listings used
              {totalListingsCreated >= 20 && (
                <span className="text-amber-500 font-semibold ml-1">
                  · <button onClick={() => onSetTab("settings")} className="underline underline-offset-2">Get verified</button> to list more
                </span>
              )}
            </p>
          )}
        </div>
        {listings.length > 0 && (
          <Button className="btn-primary rounded-full h-9 px-5 text-sm flex-shrink-0" onClick={() => navigate("/listings/new")}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Listing
          </Button>
        )}
      </div>

      {listings.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background mb-5">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your listings..."
            className="bg-transparent text-sm flex-1 outline-none placeholder:text-muted-foreground font-[inherit]"
          />
        </div>
      )}

      {listings.length === 0 && !showFirstListingBanner && <FirstListingEmptyState onStart={startListing} />}
      {listings.length === 0 && showFirstListingBanner && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Your listings will appear here once you create one.
        </div>
      )}

      {listings.length > 0 && filteredListings.length === 0 && (
        <div className="text-center py-16 text-sm text-muted-foreground">No listings match your search.</div>
      )}

      <div className="space-y-3">
        <AnimatePresence>
          {filteredListings.map((listing, i) => {
            const fallbackSvg = CATEGORY_SVGS[listing.category] ?? "/categoryicons/other.svg";
            return (
              <motion.div key={listing.id} {...itemVariant(i)}
                className={`rounded-2xl border p-4 transition-colors group
                  ${listing.status === "sold" ? "border-border opacity-60" : "border-border hover:border-primary/30 hover:bg-primary/5"}`}>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {listing.image
                      ? <img src={listing.image} alt={listing.name} className="w-full h-full object-contain p-1" />
                      : <img src={fallbackSvg} alt={listing.category} className="w-6 h-6 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-display font-semibold text-sm truncate">{listing.name}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide
                        ${listing.status === "active"
                          ? "bg-green-500/10 text-green-600 border border-green-500/20"
                          : "bg-muted text-muted-foreground border border-border"}`}>
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

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 flex-wrap">
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

                  <button
                    onClick={() => { deleteListing(listing.id); toast.success("Listing removed"); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-red-500/10 hover:border-red-500/30 transition-colors text-muted-foreground hover:text-red-500 ml-auto">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {boostingListing && (
        <Suspense fallback={null}>
          <BoostModal listing={boostingListing} onClose={() => setBoostingListing(null)} />
        </Suspense>
      )}
    </div>
  );
});

AccountListings.displayName = "AccountListings";
export default AccountListings;