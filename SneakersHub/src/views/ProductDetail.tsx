import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MapPin, X, Package, BadgeCheck,
  Share2, Copy, CheckCheck, ChevronRight, Phone,
  MessageCircle, Truck, Tag, Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePublicListings } from "@/context/PublicListingsContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SneakerCard from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isSneakerCategory = (cat: string) => cat === "Sneakers";
const isClothingCategory = (cat: string) =>
  ["Tops", "Bottoms", "Outerwear", "Activewear", "Clothes"].includes(cat);
const getSizeLabel = (cat: string) => {
  if (isSneakerCategory(cat)) return "Size (EU)";
  if (isClothingCategory(cat)) return "Size";
  return null;
};

const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  new:      { label: "New",       color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" },
  like_new: { label: "Like New",  color: "text-blue-600 bg-blue-500/10 border-blue-500/30" },
  good:     { label: "Good",      color: "text-primary bg-primary/10 border-primary/30" },
  fair:     { label: "Fair",      color: "text-amber-600 bg-amber-500/10 border-amber-500/30" },
  poor:     { label: "Poor",      color: "text-red-600 bg-red-500/10 border-red-500/30" },
};

const formatPhone = (phone: string) =>
  phone.replace(/\s+/g, "").replace(/^\+/, "").replace(/^0/, "233");

// ─── Share Button ─────────────────────────────────────────────────────────────

const ShareButton = ({ listing }: { listing: any }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = `${window.location.origin}/product/${listing.id}`;
  const text = `Check out this ${listing.title ?? listing.name} — GH₵ ${listing.price.toLocaleString()}`;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const el = document.getElementById("share-dropdown");
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: listing.title ?? listing.name, text, url }).catch(() => {});
    } else {
      setOpen((v) => !v);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Could not copy link"); }
    setOpen(false);
  };

  return (
    <div className="relative" id="share-dropdown">
      <button
        onClick={handleShare}
        className="w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
        aria-label="Share listing"
      >
        <Share2 className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute right-0 top-12 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden w-48"
          >
            <button
              onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank"); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-[#25D366] flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium">WhatsApp</span>
            </button>
            <button
              onClick={copyLink}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors border-t border-border"
            >
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
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

// ─── Contact Buttons ──────────────────────────────────────────────────────────

const ContactButtons = ({ phone, title }: { phone: string; title: string }) => {
  const formatted = formatPhone(phone);
  const waMessage = `Hi, I saw your listing for *${title}* — is it still available?`;

  return (
    <div className="grid grid-cols-2 gap-2">
      <a
        href={`https://wa.me/${formatted}?text=${encodeURIComponent(waMessage)}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 h-11 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <MessageCircle className="w-4 h-4" />
        WhatsApp
      </a>
      <a
        href={`tel:${phone}`}
        className="flex items-center justify-center gap-2 h-11 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
      >
        <Phone className="w-4 h-4" />
        Call
      </a>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { listings, loading, incrementViews } = usePublicListings();
  const { user } = useAuth();

  const [selectedSize, setSelectedSize] = useState<string | number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sellerAvatarUrl, setSellerAvatarUrl] = useState<string | null>(null);

  const listing = listings.find((l) => l.id === id);
  const related = listings
    .filter((l) => l.id !== id && l.category === listing?.category)
    .slice(0, 8);

  useEffect(() => { if (id) incrementViews?.(id); }, [id]);
  useEffect(() => { setSelectedImage(null); }, [id]);

  useEffect(() => {
    if (!listing?.sellerId) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", listing.sellerId)
      .single()
      .then(({ data }) => { if (data?.avatar_url) setSellerAvatarUrl(data.avatar_url); });
  }, [listing?.sellerId]);

  const allImages = listing
    ? [...new Set([(listing as any).images ?? [], listing.image].flat().filter(Boolean) as string[])]
    : [];
  const activeImage = selectedImage ?? allImages[0] ?? null;

  const safeTopStyle: React.CSSProperties = {
    paddingTop: `calc(env(safe-area-inset-top, 0px) + 5rem)`,
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20" style={safeTopStyle}>
          <div className="grid md:grid-cols-2 gap-8 mt-6">
            <div className="rounded-3xl bg-muted h-[320px] lg:h-[500px] animate-pulse" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`h-${i === 0 ? 8 : 5} bg-muted rounded-xl animate-pulse`} style={{ width: `${70 + i * 5}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Package className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Listing Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">This listing may have been removed.</p>
          <Button className="btn-primary rounded-xl h-11 px-6" onClick={() => navigate("/shop")}>
            Browse Listings
          </Button>
        </div>
      </div>
    );
  }

  const isOwnListing = !!user && listing.sellerId === user.id;
  const sizeLabel = getSizeLabel(listing.category);
  const parsedSizes = isSneakerCategory(listing.category)
    ? listing.sizes.map(Number)
    : listing.sizes;
  const sellerInitial = listing.sellerName?.[0]?.toUpperCase() ?? "S";
  const condition = (listing as any).condition as string | undefined;
  const negotiable = (listing as any).negotiable as boolean | undefined;
  const delivery = (listing as any).delivery as boolean | undefined;
  const phone = (listing as any).phone as string | undefined;
  const conditionMeta = condition ? CONDITION_LABELS[condition] : null;
  const title = (listing as any).title ?? listing.name;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16" style={safeTopStyle}>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 mt-2">
          <button onClick={() => navigate("/shop")} className="hover:text-foreground transition-colors">
            Browse
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium truncate">{title}</span>
        </div>

        {/* Back + Share */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back</span>
          </button>
          <ShareButton listing={listing} />
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">

          {/* ── Image Gallery ── */}
          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl lg:rounded-3xl overflow-hidden bg-muted border border-border aspect-square flex items-center justify-center group"
            >
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <Package className="w-16 h-16 text-muted-foreground/40" />
              )}

              {/* Boost badge */}
              {listing.boosted && (
                <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary text-primary-foreground text-[10px] font-bold shadow-lg">
                  <Zap className="w-2.5 h-2.5 fill-current" /> Featured
                </div>
              )}
            </motion.div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      activeImage === img ? "border-primary" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Listing Info ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-5"
          >
            {/* Category + Title */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] font-semibold">{listing.category}</Badge>
                {conditionMeta && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${conditionMeta.color}`}>
                    <BadgeCheck className="w-3 h-3" /> {conditionMeta.label}
                  </span>
                )}
              </div>
              <h1 className="font-display text-xl lg:text-3xl font-bold tracking-tight leading-tight mb-1">
                {title}
              </h1>
              {listing.brand && (
                <p className="text-sm text-muted-foreground">{listing.brand}</p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-display text-2xl lg:text-3xl font-bold text-primary">
                GH₵ {listing.price.toLocaleString()}
              </span>
              {negotiable && (
                <span className="text-xs font-semibold text-muted-foreground border border-border rounded-full px-2.5 py-1">
                  Negotiable
                </span>
              )}
            </div>

            {/* Meta pills */}
            <div className="flex flex-wrap gap-2">
              {(() => {
                const city = (listing as any).city ?? (listing as any).sellerCity;
                const region = (listing as any).region ?? (listing as any).sellerRegion;
                return (city || region) ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 border border-border rounded-full px-3 py-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    {[city, region].filter(Boolean).join(", ")}
                  </div>
                ) : null;
              })()}
              {delivery && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 border border-border rounded-full px-3 py-1.5">
                  <Truck className="w-3.5 h-3.5 text-primary" />
                  Delivery available
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>

            {/* Size Selector */}
            {sizeLabel && parsedSizes.length > 0 && (
              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> {sizeLabel}
                </label>
                <div className="flex flex-wrap gap-2">
                  {parsedSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[46px] h-10 px-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                        selectedSize === size
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/40 bg-card"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CTA — own listing or contact */}
            {isOwnListing ? (
              <div className="rounded-2xl border border-border bg-muted/30 p-4 flex items-start gap-3">
                <Package className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold mb-1">This is your listing</p>
                  <p className="text-xs text-muted-foreground mb-3">Manage it from your account.</p>
                  <Button variant="outline" className="rounded-xl h-9 text-sm" onClick={() => navigate("/account?tab=listings")}>
                    Manage Listings
                  </Button>
                </div>
              </div>
            ) : phone ? (
              <ContactButtons phone={phone} title={title} />
            ) : (
              <div className="rounded-2xl border border-border bg-muted/30 p-4 text-center">
                <p className="text-sm text-muted-foreground">Contact info not available for this listing.</p>
              </div>
            )}

            {/* Seller Card */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Posted by
              </p>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {sellerAvatarUrl ? (
                    <img src={sellerAvatarUrl} alt={listing.sellerName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-display text-base font-bold text-primary">{sellerInitial}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{listing.sellerName}</p>
                  {(() => {
                    const city = (listing as any).city ?? (listing as any).sellerCity;
                    const region = (listing as any).region ?? (listing as any).sellerRegion;
                    return (city || region) ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {[city, region].filter(Boolean).join(", ")}
                      </p>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Related Listings */}
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
                  More in {listing.category}
                </h2>
                <p className="text-xs text-muted-foreground">Similar listings you might like</p>
              </div>
              <Link
                to={`/shop?category=${encodeURIComponent(listing.category)}`}
                className="text-xs text-primary font-semibold hover:opacity-70 transition-opacity flex items-center gap-1 group"
              >
                View all <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Mobile scroll */}
            <div className="flex lg:hidden gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
              {related.map((l, i) => (
                <div key={l.id} className="snap-start flex-shrink-0 w-[72vw] max-w-[260px]">
                  <SneakerCard sneaker={{
                    id: l.id, name: (l as any).title ?? l.name, brand: l.category ?? "",
                    price: l.price, image: l.image ?? "", category: l.category,
                    sizes: l.sizes, description: l.description, isBoosted: l.boosted,
                    sellerId: l.sellerId,
                  }} index={i} />
                </div>
              ))}
            </div>

            {/* Desktop grid */}
            <div className="hidden lg:grid lg:grid-cols-4 gap-6">
              {related.map((l, i) => (
                <SneakerCard key={l.id} sneaker={{
                  id: l.id, name: (l as any).title ?? l.name, brand: l.category ?? "",
                  price: l.price, image: l.image ?? "", category: l.category,
                  sizes: l.sizes, description: l.description, isBoosted: l.boosted,
                  sellerId: l.sellerId,
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