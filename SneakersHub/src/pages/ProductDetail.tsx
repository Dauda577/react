import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ShoppingBag, Check, MapPin, Phone, CheckCircle,
  X, UserPlus, LogIn, Star, ShieldCheck, MessageCircle, BadgeCheck, Sparkles,
  Share2, Copy, CheckCheck, AlertTriangle,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { usePublicListings } from "@/context/PublicListingsContext";
import { useRatings } from "@/context/RatingContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SneakerCard from "@/components/SneakerCard";
import ChatModal from "@/components/ChatModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type SellerTier = "official" | "verified" | "standard";

const getSellerTier = (isOfficial: boolean, isVerified: boolean): SellerTier => {
  if (isOfficial) return "official";
  if (isVerified) return "verified";
  return "standard";
};

const SellerBadge = ({ tier }: { tier: SellerTier }) => {
  if (tier === "official") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border"
      style={{ background: "linear-gradient(135deg, #3b0764, #1e1b4b)", color: "#a78bfa", borderColor: "#6d28d9" }}>
      <Sparkles className="w-3 h-3" /> SneakersHub Official
    </span>
  );
  if (tier === "verified") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
      <BadgeCheck className="w-3 h-3" /> Verified Seller
    </span>
  );
  return null;
};

const PaymentBadge = ({ tier }: { tier: SellerTier }) => {
  if (tier === "official") return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-4 rounded-xl border"
      style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.08), rgba(30,27,75,0.12))", borderColor: "rgba(109,40,217,0.3)" }}>
      <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#a78bfa" }} />
      <div>
        <p className="text-xs font-bold" style={{ color: "#a78bfa" }}>SneakersHub Official Product</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          This is an official SneakersHub product. Payment is processed securely via Paystack before delivery.
        </p>
      </div>
    </motion.div>
  );
  if (tier === "verified") return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-4 rounded-xl border border-green-500/30 bg-green-500/5">
      <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold text-green-700 dark:text-green-400">Verified Seller — Secure Paystack Payment</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your payment is split at checkout via Paystack — 95% goes directly to the seller, settled next business day.
        </p>
      </div>
    </motion.div>
  );
  return null;
};

const StandardSellerWarning = ({ sellerName, sellerPhone }: { sellerName: string; sellerPhone?: string }) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Unverified Seller — Pay on Delivery</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              This seller hasn't been verified by SneakersHub. Payment is arranged directly with the seller on delivery — inspect your item before paying.
            </p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)}
          className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="pl-6 space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">We recommend:</p>
        <div className="grid grid-cols-1 gap-1.5">
          {[
            { icon: "💬", text: "Message the seller first to confirm availability" },
            { icon: "📍", text: "Arrange to meet in a safe, public location" },
            { icon: "👟", text: "Inspect the item before handing over payment" },
            { icon: "🤝", text: "Only pay cash on delivery — never upfront" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <span className="text-xs">{icon}</span>
              <p className="text-xs text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
      {sellerPhone && (
        <a href={`https://wa.me/${sellerPhone.replace(/\s+/g, "").replace(/^\+/, "").replace(/^0/, "233")}`}
          target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs font-semibold text-green-600 hover:bg-green-500/15 transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Contact {sellerName} on WhatsApp
        </a>
      )}
    </motion.div>
  );
};

const GuestPromptModal = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  return (
    <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 supports-[backdrop-filter]:backdrop-blur-sm flex items-center justify-center px-4">
      <motion.div key="modal" initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="font-display font-bold text-base">Sign in to continue</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-5">You need an account to add items to your cart and place orders.</p>
        <div className="flex flex-col gap-2">
          <Button className="btn-primary rounded-full h-10 text-sm" onClick={() => navigate("/auth")}>
            <LogIn className="w-4 h-4 mr-2" /> Sign In
          </Button>
          <Button variant="outline" className="rounded-full h-10 text-sm" onClick={() => navigate("/auth")}>
            <UserPlus className="w-4 h-4 mr-2" /> Create Account
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Share Button ──────────────────────────────────────────────────────────────
const ShareButton = ({ listing }: { listing: any }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const url = `${window.location.origin}/product/${listing.id}`;
  const text = `Check out these ${listing.name} on SneakersHub — GHS ${listing.price.toLocaleString()}`;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank");
    setOpen(false);
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
    setOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
    setOpen(false);
  };

  // Use native share on mobile if available
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: listing.name, text, url }).catch(() => {});
    } else {
      setOpen((v) => !v);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleShare}
        className="w-12 h-12 rounded-full border border-border flex items-center justify-center
          text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
        aria-label="Share listing"
      >
        <Share2 className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-14 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden w-52"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-2">
              Share this listing
            </p>

            {/* WhatsApp */}
            <button onClick={shareWhatsApp}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-sm font-medium">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#25D366" }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              WhatsApp
            </button>

            {/* Twitter / X */}
            <button onClick={shareTwitter}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-sm font-medium">
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              X (Twitter)
            </button>

            {/* Copy link */}
            <button onClick={copyLink}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-sm font-medium border-t border-border">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                {copied ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </div>
              {copied ? "Copied!" : "Copy link"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { listings, loading, incrementViews } = usePublicListings();
  const { getSellerStats, fetchReviews } = useRatings();
  const { addItem } = useCart();
  const { user, isGuest, loading: authLoading } = useAuth();

  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const listing = listings.find((l) => l.id === id);
  const related = listings.filter((l) => l.id !== id && l.category === listing?.category).slice(0, 8);
  const tier = listing ? getSellerTier(listing.sellerIsOfficial, listing.sellerVerified) : "standard";

  useEffect(() => {
    if (id) incrementViews(id);
  }, [id]);

  useEffect(() => {
    if (listing?.sellerId) fetchReviews(listing.sellerId);
  }, [listing?.sellerId]);

  const { average, count } = listing ? getSellerStats(listing.sellerId) : { average: 0, count: 0 };

  const handleAddToCart = () => {
    if (authLoading) return;
    if (!user || isGuest) { setShowGuestModal(true); return; }
    if (user.role === "seller") { toast.error("Sellers cannot buy"); return; }
    if (!selectedSize) { toast.error("Please select a size"); return; }
    if (!listing) return;

    addItem({
      id: listing.id,
      name: listing.name,
      brand: listing.brand,
      price: listing.price,
      image: listing.image ?? "",
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      sellerVerified: listing.sellerVerified ?? false,
      sellerIsOfficial: listing.sellerIsOfficial ?? false,
      sellerSubaccountCode: listing.sellerSubaccountCode ?? null,
      sellerCity: listing.city ?? listing.sellerCity ?? null,
      sellerRegion: listing.region ?? listing.sellerRegion ?? null,
      shippingCost: listing.shippingCost ?? 0,
      handlingTime: listing.handlingTime ?? "Ships in 1-3 days",
    }, selectedSize);
    setAdded(true);
    toast.success("Added to cart!");
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="section-padding max-w-6xl mx-auto pt-28 pb-20" style={{ paddingTop: `calc(112px + env(safe-area-inset-top, 0px))` }}>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="rounded-2xl bg-card border border-border h-96 animate-pulse" />
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-6 bg-card border border-border rounded-xl animate-pulse" style={{ width: `${80 - i * 10}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navbar />
        <div className="text-center pt-28" style={{ paddingTop: `calc(112px + env(safe-area-inset-top, 0px))` }}>
          <p className="font-display text-2xl font-bold mb-2">Listing not found</p>
          <p className="text-muted-foreground mb-6">This listing may have been removed or sold.</p>
          <Button className="btn-primary rounded-full" onClick={() => navigate("/shop")}>Back to Shop</Button>
        </div>
      </div>
    );
  }

  const isSeller = user?.role === "seller";
  const sellerBlocked = isSeller && tier !== "official";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AnimatePresence>{showGuestModal && <GuestPromptModal onClose={() => setShowGuestModal(false)} />}</AnimatePresence>
      <AnimatePresence>
        {showChat && (
          <ChatModal
            receiverId={listing.sellerId}
            receiverName={listing.sellerName}
            listingId={listing.id}
            listingName={listing.name}
            onClose={() => setShowChat(false)}
          />
        )}
      </AnimatePresence>

      <div className="section-padding max-w-6xl mx-auto pt-28 pb-20" style={{ paddingTop: `calc(112px + env(safe-area-inset-top, 0px))` }}>

        {/* Back + Share row */}
        <div className="flex items-center justify-between mb-8 pt-2">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group text-sm">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
          </button>
          <ShareButton listing={listing} />
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">

          {/* ── Image ── */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
            className="relative rounded-2xl overflow-hidden bg-card border aspect-square flex items-center justify-center"
            style={{ borderColor: tier === "official" ? "rgba(109,40,217,0.3)" : tier === "verified" ? "rgba(34,197,94,0.2)" : undefined }}>
            {listing.image
              ? <img src={listing.image} alt={listing.name} className="w-full h-full object-cover" />
              : <span className="text-8xl">👟</span>
            }
            {tier === "official" && (
              <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #3b0764, #1e1b4b)", color: "#a78bfa", border: "1px solid rgba(109,40,217,0.5)" }}>
                <Sparkles className="w-3 h-3" /> SneakersHub Official
              </div>
            )}
            {tier === "verified" && !listing.boosted && (
              <div className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "rgba(34,197,94,0.15)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.3)" }}>
                <BadgeCheck className="w-3 h-3" /> Verified
              </div>
            )}
            {listing.boosted && tier !== "official" && (
              <div className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "white" }}>
                ⚡ Featured
              </div>
            )}
          </motion.div>

          {/* ── Info ── */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.2em] mb-1">{listing.brand}</p>
              <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{listing.name}</h1>
              <p className="text-xs text-muted-foreground mt-1">{listing.category}</p>
            </div>

            <p className="font-display text-3xl font-bold text-primary">GHS {listing.price.toLocaleString()}</p>

            <p className="text-muted-foreground text-sm leading-relaxed">{listing.description}</p>

            {/* Sizes */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Size (EU) {selectedSize && <span className="text-primary ml-2">— Selected: {selectedSize}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {listing.sizes.map((size) => (
                  <button key={size} onClick={() => setSelectedSize(size)}
                    className={`w-11 h-11 rounded-xl border text-sm font-semibold transition-all
                      ${selectedSize === size ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50 text-foreground"}`}>
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <PaymentBadge tier={tier} />

            {/* Standard seller warning — show only to logged-in buyers */}
            {tier === "standard" && user && !isGuest && !isSeller && (
              <StandardSellerWarning
                sellerName={listing.sellerName}
                sellerPhone={listing.sellerPhone}
              />
            )}

            {sellerBlocked ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-muted/30 p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-display font-semibold text-foreground mb-1">Seller accounts can't purchase</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Buying and selling are kept separate for security. To purchase sneakers you'll need a buyer account.{" "}
                    <Link to="/auth" className="text-primary font-semibold hover:opacity-70 transition-opacity">Create one here →</Link>
                  </p>
                </div>
              </motion.div>
            ) : (
              <Button onClick={handleAddToCart} disabled={authLoading}
                className={`w-full h-12 rounded-full font-display text-sm transition-all ${added ? "bg-green-500 hover:bg-green-500" : "btn-primary"}`}>
                {authLoading
                  ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Loading...</span>
                  : added
                    ? <><Check className="w-4 h-4 mr-2" /> Added!</>
                    : <><ShoppingBag className="w-4 h-4 mr-2" /> Add to Cart</>
                }
              </Button>
            )}

            {user && !isGuest && !isSeller && tier !== "official" && (
              <button onClick={() => setShowChat(true)}
                className="w-full h-12 rounded-full border border-border text-sm font-semibold
                  hover:bg-primary/5 hover:border-primary/40 transition-all flex items-center justify-center gap-2 text-foreground">
                <MessageCircle className="w-4 h-4" /> Message Seller
              </button>
            )}

            {/* Seller card */}
            <div className="rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sold by</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground">Active</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                  tier === "official"
                    ? "bg-gradient-to-br from-violet-900 to-indigo-900 border border-violet-500/30"
                    : "bg-primary/10"
                }`}>
                  {tier === "official"
                    ? <Sparkles className="w-5 h-5" style={{ color: "#a78bfa" }} />
                    : <span className="font-display text-sm font-bold text-primary">{listing.sellerName[0].toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{listing.sellerName}</p>
                    <SellerBadge tier={tier} />
                    {listing.boosted && tier !== "official" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        ⚡ Featured
                      </span>
                    )}
                  </div>
                  {count > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      {[1,2,3,4,5].map((n) => (
                        <Star key={n} className={`w-3 h-3 ${n <= Math.round(average) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                      <span className="text-xs text-muted-foreground ml-0.5">{average} ({count} {count === 1 ? "review" : "reviews"})</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                {(() => {
                  const city = listing.city ?? listing.sellerCity;
                  const region = listing.region ?? listing.sellerRegion;
                  return (city || region) ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      {[city, region].filter(Boolean).join(", ")}
                    </p>
                  ) : null;
                })()}
                {listing.sellerPhone && tier !== "official" && (
                  <a href={`tel:${listing.sellerPhone}`}
                    className="text-xs text-muted-foreground flex items-center gap-2 hover:text-primary transition-colors">
                    <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" /> {listing.sellerPhone}
                  </a>
                )}
              </div>

              {(() => {
                const city = listing.city ?? listing.sellerCity;
                const region = listing.region ?? listing.sellerRegion;
                const locationLabel = [city, region].filter(Boolean).join(", ") || "Ghana";
                return (
                  <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
                    <div className="text-center px-2 py-2 rounded-xl bg-muted/30">
                      <p className="font-display font-bold text-sm">{count > 0 ? average : "—"}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Rating</p>
                    </div>
                    <div className="text-center px-2 py-2 rounded-xl bg-muted/30">
                      <p className="font-display font-bold text-sm">{listing.sellerMemberSince}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Member since</p>
                    </div>
                    <div className="text-center px-2 py-2 rounded-xl bg-muted/30">
                      <MapPin className="w-3 h-3 text-primary mx-auto mb-0.5" />
                      <p className="font-display font-bold text-[11px] truncate">{locationLabel}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Location</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-20">
            <div className="flex items-center justify-between mb-6 gap-4">
              <h2 className="font-display text-2xl font-bold tracking-tight">More in {listing.category}</h2>
              <Link to="/shop" className="text-sm text-primary font-semibold hover:opacity-70 transition-opacity flex-shrink-0">
                View all →
              </Link>
            </div>

            {/* Mobile: horizontal scroll */}
            <div className="flex sm:hidden gap-4 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory">
              {related.map((l, i) => (
                <div key={l.id} className="snap-start flex-shrink-0 w-[72vw] max-w-[260px]">
                  <SneakerCard sneaker={{
                    id: l.id, name: l.name, brand: l.brand, price: l.price,
                    image: l.image ?? "", category: l.category, sizes: l.sizes,
                    description: l.description, isBoosted: l.boosted,
                    sellerVerified: l.sellerVerified,
                    sellerIsOfficial: l.sellerIsOfficial,
                  }} index={i} />
                </div>
              ))}
            </div>

            {/* Tablet+: grid */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((l, i) => (
                <SneakerCard key={l.id} sneaker={{
                  id: l.id, name: l.name, brand: l.brand, price: l.price,
                  image: l.image ?? "", category: l.category, sizes: l.sizes,
                  description: l.description, isBoosted: l.boosted,
                  sellerVerified: l.sellerVerified,
                  sellerIsOfficial: l.sellerIsOfficial,
                }} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default ProductDetail;