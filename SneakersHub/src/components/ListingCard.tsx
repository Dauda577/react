import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Heart, Zap, Sparkles, BadgeCheck } from "lucide-react";
import { useSaved } from "@/context/SavedContext";
import { useAuth } from "@/context/AuthContext";
import { cardImage } from "@/lib/imageutils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useState, useCallback, useMemo, memo } from "react";

interface Listing {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string | null;
  category: string;
  description: string;
  condition?: string | null;
  negotiable?: boolean;
  deliveryAvailable?: boolean;
  isBoosted?: boolean;
  sellerVerified?: boolean;
  sellerIsOfficial?: boolean;
  sellerId?: string;
  sellerName?: string;
  sellerCity?: string | null;
  sellerRegion?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
}

interface ListingCardProps {
  listing: Listing;
  index: number;
}

const resolveBrandLabel = (brand: string, category: string, sellerName?: string): string | null => {
  const normalized = brand?.trim().toUpperCase();
  if (!normalized || normalized === "OTHER" || normalized === category.toUpperCase()) {
    return sellerName?.trim() || null;
  }
  return brand.trim();
};

const ListingCard = memo(({ listing, index }: ListingCardProps) => {
  const { toggleSaved, isSaved } = useSaved();
  const { user, isGuest } = useAuth();

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const saved = useMemo(() => isSaved(listing.id), [isSaved, listing.id]);

  const fallbackSvg = useMemo(() =>
    `/categoryicons/${listing.category.toLowerCase()}.svg`,
    [listing.category]
  );

  const brandLabel = useMemo(() =>
    resolveBrandLabel(listing.brand, listing.category, listing.sellerName),
    [listing.brand, listing.category, listing.sellerName]
  );

  const handleSave = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSaved({
      id: listing.id,
      name: listing.name,
      brand: listing.brand,
      price: listing.price,
      image: listing.image,
      category: listing.category,
      description: listing.description,
      sellerVerified: listing.sellerVerified ?? false,
      sellerIsOfficial: listing.sellerIsOfficial ?? false,
      isBoosted: listing.isBoosted ?? false,
    });
    toast.success(saved ? "Removed from saved" : "Saved!", {
      icon: saved ? "💔" : "❤️",
      duration: 2000,
    });
  }, [saved, toggleSaved, listing]);

  const handleImageLoad = useCallback(() => setImageLoaded(true), []);
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index, 6) * 0.03 }}
      className="group relative h-full"
    >
      <div className="relative h-full flex flex-col rounded-2xl bg-card border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-border hover:-translate-y-1">

        {/* Save Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSave}
          className={`absolute top-3 right-3 z-20 w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur-md transition-all duration-300 shadow-lg ${
            saved
              ? "bg-gradient-to-br from-red-500 to-rose-600 text-white border-0 shadow-red-500/25"
              : "bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800"
          }`}
          aria-label={saved ? "Remove from saved" : "Save listing"}
        >
          <Heart className={`w-3.5 h-3.5 transition-all duration-300 ${saved ? "fill-current scale-110" : "hover:scale-110"}`} />
        </motion.button>

        <Link to={`/product/${listing.id}`} className="flex flex-col flex-grow">

          {/* Image */}
          <div className="relative w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 overflow-hidden flex-shrink-0">
            {!imageError && listing.image ? (
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
                )}
                <img
                  src={cardImage(listing.image)}
                  alt={listing.name}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
                    imageLoaded ? "scale-100 group-hover:scale-110" : "scale-105 blur-sm"
                  }`}
                  loading="lazy"
                  decoding="async"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <img
                  src={fallbackSvg}
                  alt={listing.category}
                  className="w-14 h-14 opacity-40 transition-opacity group-hover:opacity-60"
                  loading="lazy"
                />
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
              {listing.sellerIsOfficial && (
                <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 shadow-lg shadow-purple-500/25 px-2 py-1 text-[9px] font-semibold tracking-wider flex items-center gap-1 backdrop-blur-sm">
                  <Sparkles className="w-2.5 h-2.5" />
                  OFFICIAL STORE
                </Badge>
              )}
              {!listing.sellerIsOfficial && listing.isBoosted && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-orange-500/25 px-2 py-1 text-[9px] font-semibold tracking-wider flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" />
                  FEATURED
                </Badge>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-3.5 flex flex-col flex-grow">
            {brandLabel && (
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 line-clamp-1">
                {brandLabel}
              </p>
            )}

            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 text-sm leading-snug line-clamp-2 mb-2">
              {listing.name}
            </h3>

            {/* Condition + Negotiable */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {listing.condition && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                  {listing.condition}
                </span>
              )}
              {listing.negotiable && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Negotiable
                </span>
              )}
              {listing.deliveryAvailable && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                  Delivery
                </span>
              )}
            </div>

            {/* Price row */}
            <div className="flex items-center justify-between gap-2 mt-auto">
              <span className="text-base font-bold text-foreground leading-tight whitespace-nowrap">
                GH₵ {listing.price.toLocaleString()}
              </span>

              {listing.sellerVerified && !listing.sellerIsOfficial && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20 flex-shrink-0">
                  <BadgeCheck className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wide">
                    VERIFIED
                  </span>
                </div>
              )}
            </div>
          </div>
        </Link>
      </div>
    </motion.div>
  );
});

ListingCard.displayName = "ListingCard";

export default ListingCard;