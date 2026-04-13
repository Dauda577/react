import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ShoppingBag, Check, MapPin, Phone, CheckCircle,
  X, UserPlus, LogIn, Star, ShieldCheck, MessageCircle, BadgeCheck, Sparkles,
  Share2, Copy, CheckCheck, AlertTriangle, Truck, Package, Award,
  ChevronRight, Heart, CreditCard, Clock,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { detailImage } from "@/lib/imageutils";
import { usePublicListings } from "@/context/PublicListingsContext";
import { useRatings } from "@/context/RatingContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SneakerCard from "@/components/SneakerCard";
import ChatModal from "@/components/ChatModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CATEGORY_SVGS } from "@/data/sneakers";
import { supabase } from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SellerTier = "official" | "verified" | "standard";

const getSellerTier = (isOfficial: boolean, isVerified: boolean): SellerTier => {
  if (isOfficial) return "official";
  if (isVerified) return "verified";
  return "standard";
};

const isSneakerCategory = (cat: string) => cat === "Sneakers";

const isClothingCategory = (cat: string) =>
  ["Tops", "Bottoms", "Outerwear", "Activewear"].includes(cat);

const getSizeLabel = (cat: string) => {
  if (isSneakerCategory(cat)) return "Size (EU)";
  if (isClothingCategory(cat)) return "Size";
  return null;
};

const getFallbackSvg = (cat: string) => CATEGORY_SVGS[cat] ?? "/categoryicons/other.svg";

const getShareText = (listing: any) =>
  `Check out this ${listing.name} on SneakersHub — GH₵ ${listing.price.toLocaleString()}`;

// ─── Enhanced Sub-components ──────────────────────────────────────────────────

const SellerBadge = ({ tier, size = "default" }: { tier: SellerTier; size?: "sm" | "default" }) => {
  const sizeClasses = size === "sm" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5";

  if (tier === "official") return (
    <motion.span
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center gap-1 ${sizeClasses} font-bold rounded-lg backdrop-blur-sm shadow-lg`}
      style={{
        background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
        color: "white",
        border: "1px solid rgba(255,255,255,0.1)"
      }}
    >
      <Sparkles className="w-2.5 h-2.5" /> OFFICIAL
    </motion.span>
  );
  if (tier === "verified") return (
    <motion.span
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center gap-1 ${sizeClasses} font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 rounded-lg border border-emerald-500/30 backdrop-blur-sm`}
    >
      <BadgeCheck className="w-2.5 h-2.5" /> VERIFIED
    </motion.span>
  );
  return null;
};

const PaymentBadge = ({ tier }: { tier: SellerTier }) => {
  if (tier === "official") return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-violet-500/5 via-indigo-500/5 to-transparent border border-violet-500/20"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
      <div className="relative flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-violet-700 dark:text-violet-400 mb-0.5 text-sm">Official SneakersHub Product</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This is an official SneakersHub product. Payment is processed securely via Paystack with buyer protection.
          </p>
        </div>
      </div>
    </motion.div>
  );

  if (tier === "verified") return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-4 bg-emerald-500/5 border border-emerald-500/20"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-16 -mt-16" />
      <div className="relative flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-emerald-700 dark:text-emerald-400 mb-0.5 text-sm">Verified Seller — Secure Payment</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your payment is processed securely via Paystack. 95% goes directly to the seller, settled next business day.
          </p>
        </div>
      </div>
    </motion.div>
  );

  return null;
};

const StandardSellerWarning = ({ sellerName, sellerPhone }: { sellerName: string; sellerPhone?: string }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-amber-700 dark:text-amber-400 mb-0.5 text-sm">Unverified Seller</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This seller hasn't been verified. Payment is arranged directly with the seller on delivery — inspect your item before paying.
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="w-7 h-7 rounded-lg hover:bg-amber-500/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="pl-12 space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Safety Tips:</p>
        <div className="grid grid-cols-1 gap-1.5">
          {[
            { icon: MessageCircle, text: "Message the seller first to confirm availability" },
            { icon: MapPin, text: "Arrange to meet in a safe, public location" },
            { icon: Package, text: "Inspect the item before handing over payment" },
            { icon: CreditCard, text: "Only pay cash on delivery — never upfront" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {sellerPhone && (
        <a
          href={`https://wa.me/${sellerPhone.replace(/\s+/g, "").replace(/^\+/, "").replace(/^0/, "233")}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-xs font-semibold text-green-600 dark:text-green-400 hover:bg-green-500/15 transition-all group"
        >
          <svg className="w-3.5 h-3.5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold">Welcome to SneakersHub</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Create an account to start shopping, save your favorite items, and track your orders.
          </p>

          <div className="space-y-2.5">
            <Button
              className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              onClick={() => navigate("/auth")}
            >
              <LogIn className="w-4 h-4 mr-2" /> Sign In
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl font-semibold"
              onClick={() => navigate("/auth")}
            >
              <UserPlus className="w-4 h-4 mr-2" /> Create Account
            </Button>
          </div>

          <p className="text-[11px] text-center text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ShareButton = ({ listing }: { listing: any }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const url = `${window.location.origin}/product/${listing.id}`;
  const text = getShareText(listing);

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
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
    setOpen(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: listing.name, text, url }).catch(() => { });
    } else {
      setOpen((v) => !v);
    }
  };

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleShare}
        className="w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 hover:shadow-lg transition-all"
        aria-label="Share listing"
      >
        <Share2 className="w-4 h-4" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute right-0 top-12 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden w-52"
          >
            <div className="px-4 pt-3 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Share via
              </p>
            </div>

            <button
              onClick={shareWhatsApp}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                </svg>
              </div>
              <span className="text-sm font-medium">WhatsApp</span>
            </button>

            <button
              onClick={shareTwitter}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="white">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622z" />
                </svg>
              </div>
              <span className="text-sm font-medium">X (Twitter)</span>
            </button>

            <button
              onClick={copyLink}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors border-t border-border"
            >
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </div>
              <span className="text-sm font-medium">{copied ? "Copied!" : "Copy link"}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const WhatsAppOrderButton = ({
  listing, selectedSize, tier,
}: {
  listing: any;
  selectedSize: string | number | null;
  tier: SellerTier;
}) => {
  if (tier !== "official") return null;

  const OFFICIAL_WA = "233256221777";

  const handleClick = () => {
    if (!selectedSize) {
      toast.error("Please select a size before ordering");
      return;
    }
    const productUrl = `${window.location.origin}/product/${listing.id}`;
    const sizeLabel = isSneakerCategory(listing.category) ? `EU ${selectedSize}` : `Size ${selectedSize}`;
    const message =
      `Hi! I'd like to order this official SneakersHub product\n\n` +
      `*${listing.name}*\n` +
      `Brand: ${listing.brand}\n` +
      `${sizeLabel}\n` +
      `Price: GH₵ ${listing.price.toLocaleString()}\n\n` +
      `Listing: ${productUrl}`;

    window.open(`https://wa.me/${OFFICIAL_WA}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="w-full h-11 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-500/20 transition-all"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
      </svg>
      Order via WhatsApp
    </motion.button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { listings, loading, incrementViews } = usePublicListings();
  const { getSellerStats, fetchReviews } = useRatings();
  const { addItem } = useCart();
  const { user, isGuest, loading: authLoading } = useAuth();

  const [selectedSize, setSelectedSize] = useState<string | number | null>(null);
  const [added, setAdded] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [sellerAvatarUrl, setSellerAvatarUrl] = useState<string | null>(null);

  const listing = listings.find((l) => l.id === id);
  const related = listings.filter((l) => l.id !== id && l.category === listing?.category).slice(0, 8);
  const tier = listing ? getSellerTier(listing.sellerIsOfficial, listing.sellerVerified) : "standard";

  const discountedPrice = listing?.discountPercent
    ? Math.round(listing.price * (1 - listing.discountPercent / 100))
    : null;

  useEffect(() => {
    if (id) incrementViews(id);
  }, [id]);

  useEffect(() => {
    if (listing?.sellerId) fetchReviews(listing.sellerId);
  }, [listing?.sellerId]);

  useEffect(() => {
    setSelectedImage(null);
  }, [id]);

  useEffect(() => {
    if (!listing?.sellerId) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", listing.sellerId)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setSellerAvatarUrl(data.avatar_url);
      });
  }, [listing?.sellerId]);

  const { average, count } = listing ? getSellerStats(listing.sellerId) : { average: 0, count: 0 };
  const allImages = listing ? [(listing as any).images ?? [], listing.image].flat().filter(Boolean) as string[] : [];
  const uniqueImages = [...new Set(allImages)];
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const activeImage = selectedImage ?? uniqueImages[0] ?? null;

  const handleAddToCart = () => {
    if (authLoading) return;
    if (!user || isGuest) { setShowGuestModal(true); return; }

    if (listing?.sellerId === user.id) {
      toast.error("You cannot buy your own item", { description: "This is your own listing" });
      return;
    }

    const sizeLabel = getSizeLabel(listing?.category ?? "");
    if (sizeLabel && !selectedSize) {
      toast.error("Please select a size");
      return;
    }

    if (!listing) return;

    const finalPrice = discountedPrice ?? listing.price;

    const cartListing = {
      id: listing.id,
      name: listing.name,
      brand: listing.brand,
      price: finalPrice,
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
    };

    addItem(cartListing, selectedSize ?? "one-size");
    setAdded(true);
    toast.success(listing.discountPercent
      ? `Added to cart with ${listing.discountPercent}% discount!`
      : "Added to cart!");
    setTimeout(() => setAdded(false), 2000);
  };

  // PWA safe-area-aware top padding:
  // On regular browsers env(safe-area-inset-top) is 0, so this equals the navbar height.
  // On PWA / notched devices it adds the extra status-bar inset on top.
  const navbarHeightMobile = "5rem";   // ~80px  (matches pt-20)
  const navbarHeightDesktop = "6rem";  // ~96px  (matches pt-24, visually lg:pt-28 keeps extra breathing room)
  const safeTopStyle: React.CSSProperties = {
    paddingTop: `calc(env(safe-area-inset-top, 0px) + ${navbarHeightMobile})`,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="section-padding max-w-6xl mx-auto lg:pt-28 pb-20" style={safeTopStyle}>
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <div className="rounded-3xl bg-card border border-border h-[300px] lg:h-[500px] animate-pulse" />
            <div className="space-y-3">
              <div className="h-7 bg-card border border-border rounded-xl animate-pulse w-3/4" />
              <div className="h-5 bg-card border border-border rounded-xl animate-pulse w-1/2" />
              <div className="h-16 bg-card border border-border rounded-xl animate-pulse" />
              <div className="h-11 bg-card border border-border rounded-xl animate-pulse" />
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
        <div className="text-center px-4" style={safeTopStyle}>
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-muted flex items-center justify-center">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">Listing Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">This listing may have been removed or sold.</p>
          <Button className="btn-primary rounded-xl h-11 px-6" onClick={() => navigate("/shop")}>
            Browse Shop
          </Button>
        </div>
      </div>
    );
  }

  const isSeller = user?.role === "seller";
  const isOwnListing = !!user && listing?.sellerId === user.id;
  const sellerBlocked = isOwnListing;
  const sizeLabel = getSizeLabel(listing.category);
  const fallbackSvg = getFallbackSvg(listing.category);

  const parsedSizes = isSneakerCategory(listing.category)
    ? listing.sizes.map(Number)
    : listing.sizes;

  const sellerInitial = listing.sellerName?.[0]?.toUpperCase() ?? "S";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <AnimatePresence>
        {showGuestModal && <GuestPromptModal onClose={() => setShowGuestModal(false)} />}
      </AnimatePresence>

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

      <div className="section-padding max-w-6xl mx-auto lg:pt-28 pb-16" style={safeTopStyle}>
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <button
            onClick={() => navigate("/shop")}
            className="hover:text-foreground transition-colors"
          >
            Shop
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium truncate">{listing.name}</span>
        </div>

        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <motion.button
            whileHover={{ x: -4 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back</span>
          </motion.button>
          <ShareButton listing={listing} />
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Image Gallery Section */}
          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl lg:rounded-3xl overflow-hidden bg-gradient-to-br from-card to-card/50 border border-border aspect-square flex items-center justify-center group"
            >
              {activeImage ? (
                <img
                  src={detailImage(activeImage)}
                  alt={listing.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <img src={fallbackSvg} alt={listing.category} className="w-20 h-20 opacity-40" />
              )}

              {/* Badges Overlay */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {tier === "official" && (
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold backdrop-blur-md shadow-xl"
                    style={{
                      background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                      color: "white",
                      border: "1px solid rgba(255,255,255,0.2)"
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      <span>SneakersHub Official</span>
                    </div>
                  </motion.div>
                )}

                {listing.discountPercent && (
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="px-3 py-1.5 rounded-xl bg-red-500 text-white text-[11px] font-bold backdrop-blur-md shadow-xl"
                  >
                    {listing.discountPercent}% OFF
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Thumbnails */}
            {uniqueImages.length > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex gap-2 overflow-x-auto pb-1"
              >
                {uniqueImages.map((img, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedImage(img)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${activeImage === img
                      ? "border-primary shadow-lg shadow-primary/25"
                      : "border-border hover:border-primary/40"
                      }`}
                  >
                    <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Product Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4 lg:space-y-6"
          >
            {/* Brand & Title */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="text-[10px] font-semibold">
                  {listing.category}
                </Badge>
                {listing.isNew && (
                  <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold">
                    New Arrival
                  </Badge>
                )}
              </div>
              <h1 className="font-display text-xl lg:text-3xl xl:text-4xl font-bold tracking-tight mb-1.5 leading-tight">
                {listing.name}
              </h1>
              <p className="text-primary font-display text-xs font-semibold uppercase tracking-wider">
                {listing.brand}
              </p>
            </div>

            {/* Price Section */}
            <div className="space-y-1">
              {discountedPrice ? (
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className="font-display text-2xl lg:text-3xl font-bold text-primary">
                    GH₵ {discountedPrice.toLocaleString()}
                  </span>
                  <span className="text-base lg:text-xl text-muted-foreground line-through">
                    GH₵ {listing.price.toLocaleString()}
                  </span>
                  <Badge className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5">
                    Save {listing.discountPercent}%
                  </Badge>
                </div>
              ) : (
                <span className="font-display text-2xl lg:text-4xl font-bold text-primary">
                  GH₵ {listing.price.toLocaleString()}
                </span>
              )}
            </div>

            {/* Description */}
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {listing.description}
              </p>
            </div>

            {/* Size Selector */}
            {sizeLabel && parsedSizes.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {sizeLabel}
                  </label>
                  {selectedSize && (
                    <span className="text-xs text-primary font-medium">
                      Selected: {selectedSize}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {parsedSizes.map((size) => (
                    <motion.button
                      key={size}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[46px] h-10 px-3 rounded-xl border-2 text-sm font-semibold transition-all ${selectedSize === size
                        ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "border-border hover:border-primary/40 bg-card hover:bg-muted/50"
                        }`}
                    >
                      {size}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Info */}
            <PaymentBadge tier={tier} />

            {/* Standard Seller Warning */}
            {tier === "standard" && user && !isGuest && !isSeller && (
              <StandardSellerWarning
                sellerName={listing.sellerName}
                sellerPhone={listing.sellerPhone}
              />
            )}

            {/* Action Buttons */}
            {sellerBlocked ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-muted/30 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-base mb-0.5">This is your listing</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      You can't purchase your own item. Manage it from your dashboard.
                    </p>
                    <Button
                      variant="outline"
                      className="rounded-xl h-9 text-sm"
                      onClick={() => navigate("/account?tab=listings")}
                    >
                      Manage Listings
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-2.5">
                <Button
                  onClick={handleAddToCart}
                  disabled={authLoading}
                  className={`w-full h-11 rounded-xl font-display text-sm transition-all ${added
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                    }`}
                >
                  {authLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : added ? (
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4" /> Added to Cart!
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" /> Add to Cart
                    </span>
                  )}
                </Button>

                <WhatsAppOrderButton listing={listing} selectedSize={selectedSize} tier={tier} />
              </div>
            )}

            {/* Message Seller Button */}
            {user && !isGuest && !isOwnListing && (
              <Button
                variant="outline"
                onClick={() => setShowChat(true)}
                className="w-full h-11 rounded-xl font-semibold text-sm"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message Seller
              </Button>
            )}

            {/* Seller Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Seller Information
                </h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-muted-foreground font-medium">Active now</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${tier === "official"
                  ? "bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25"
                  : "bg-primary/10"
                  }`}>
                  {tier === "official" ? (
                    <Sparkles className="w-5 h-5 text-white" />
                  ) : sellerAvatarUrl ? (
                    <img
                      src={sellerAvatarUrl}
                      alt={listing.sellerName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-display text-lg font-bold text-primary">
                      {sellerInitial}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <h4 className="font-display font-bold text-sm">{listing.sellerName}</h4>
                    <SellerBadge tier={tier} size="sm" />
                  </div>

                  {count > 0 ? (
                    <div className="flex items-center gap-1 mb-1.5">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`w-3.5 h-3.5 ${n <= Math.round(average)
                              ? "text-amber-400 fill-amber-400"
                              : "text-muted-foreground/30"
                              }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground ml-1">
                        {average.toFixed(1)} ({count} {count === 1 ? "review" : "reviews"})
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mb-1.5">No reviews yet</p>
                  )}

                  <div className="space-y-1">
                    {(() => {
                      const city = listing.city ?? listing.sellerCity;
                      const region = listing.region ?? listing.sellerRegion;
                      return (city || region) ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span>{[city, region].filter(Boolean).join(", ")}</span>
                        </div>
                      ) : null;
                    })()}

                    {listing.sellerMemberSince && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span>Member since {listing.sellerMemberSince}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
                <div className="text-center p-2.5 rounded-xl bg-muted/30">
                  <Award className="w-4 h-4 text-primary mx-auto mb-0.5" />
                  <p className="font-display font-bold text-base">{count}</p>
                  <p className="text-[10px] text-muted-foreground">Reviews</p>
                </div>
                <div className="text-center p-2.5 rounded-xl bg-muted/30">
                  <Truck className="w-4 h-4 text-primary mx-auto mb-0.5" />
                  <p className="font-display font-bold text-xs">1-3 days</p>
                  <p className="text-[10px] text-muted-foreground">Shipping</p>
                </div>
                <div className="text-center p-2.5 rounded-xl bg-muted/30">
                  <ShieldCheck className="w-4 h-4 text-primary mx-auto mb-0.5" />
                  <p className="font-display font-bold text-xs">
                    {tier === "official" ? "Official" : tier === "verified" ? "Verified" : "Standard"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Status</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Related Products Section */}
        {related.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-14 lg:mt-20"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-lg lg:text-2xl font-bold tracking-tight mb-1">
                  More from {listing.category}
                </h2>
                <p className="text-xs text-muted-foreground">You might also like these items</p>
              </div>
              <Link
                to={`/shop?category=${encodeURIComponent(listing.category)}`}
                className="text-xs text-primary font-semibold hover:opacity-70 transition-opacity flex items-center gap-1 group"
              >
                View all
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Mobile Horizontal Scroll */}
            <div className="flex lg:hidden gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
              {related.map((l, i) => (
                <div key={l.id} className="snap-start flex-shrink-0 w-[72vw] max-w-[260px]">
                  <SneakerCard sneaker={{
                    id: l.id, name: l.name, brand: l.brand, price: l.price,
                    image: l.image ?? "", category: l.category, sizes: l.sizes,
                    description: l.description, isBoosted: l.boosted,
                    sellerVerified: l.sellerVerified, sellerIsOfficial: l.sellerIsOfficial,
                    discountPercent: l.discountPercent,
                    sellerId: l.sellerId,
                    sellerName: l.sellerName,
                    sellerSubaccountCode: l.sellerSubaccountCode ?? null,
                    sellerCity: l.city ?? l.sellerCity ?? null,
                    sellerRegion: l.region ?? l.sellerRegion ?? null,
                    shippingCost: l.shippingCost ?? 0,
                    handlingTime: l.handlingTime ?? "Ships in 1-3 days",
                  }} index={i} />
                </div>
              ))}
            </div>

            {/* Desktop Grid */}
            <div className="hidden lg:grid lg:grid-cols-4 gap-6">
              {related.map((l, i) => (
                <SneakerCard key={l.id} sneaker={{
                  id: l.id, name: l.name, brand: l.brand, price: l.price,
                  image: l.image ?? "", category: l.category, sizes: l.sizes,
                  description: l.description, isBoosted: l.boosted,
                  sellerVerified: l.sellerVerified, sellerIsOfficial: l.sellerIsOfficial,
                  discountPercent: l.discountPercent,
                  sellerId: l.sellerId,
                  sellerName: l.sellerName,
                  sellerSubaccountCode: l.sellerSubaccountCode ?? null,
                  sellerCity: l.city ?? l.sellerCity ?? null,
                  sellerRegion: l.region ?? l.sellerRegion ?? null,
                  shippingCost: l.shippingCost ?? 0,
                  handlingTime: l.handlingTime ?? "Ships in 1-3 days",
                }} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default ProductDetail;