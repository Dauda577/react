import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Heart, Zap, Sparkles, BadgeCheck, ShoppingBag } from "lucide-react";
import { useSaved } from "@/context/SavedContext";
import { cardImage } from "@/lib/imageutils";
import { toast } from "sonner";
import { CATEGORY_SVGS } from "@/data/sneakers";
import { useSound } from "@/hooks/useSound";
import { motion } from "framer-motion";
import { useState } from "react";

interface SneakerCardSneaker {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string | null;
  category: string;
  sizes: number[];
  description: string;
  isBoosted?: boolean;
  sellerVerified?: boolean;
  sellerIsOfficial?: boolean;
  isNew?: boolean;
  discountPercent?: number | null;
}

interface SneakerCardProps {
  sneaker: SneakerCardSneaker;
  index: number;
}

const SneakerCard = ({ sneaker, index }: SneakerCardProps) => {
  const { toggleSaved, isSaved } = useSaved();
  const { play } = useSound();
  const saved = isSaved(sneaker.id);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const discountedPrice = sneaker.discountPercent
    ? Math.round(sneaker.price * (1 - sneaker.discountPercent / 100))
    : null;

  const fallbackSvg = CATEGORY_SVGS[sneaker.category] ?? "/categoryicons/other.svg";

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    play(saved ? "unsave" : "save");
    toggleSaved({
      id: sneaker.id,
      name: sneaker.name,
      brand: sneaker.brand,
      price: sneaker.price,
      image: sneaker.image,
      category: sneaker.category,
      sizes: sneaker.sizes,
      description: sneaker.description,
      sellerVerified: sneaker.sellerVerified ?? false,
      sellerIsOfficial: sneaker.sellerIsOfficial ?? false,
      isBoosted: sneaker.isBoosted ?? false,
      discountPercent: sneaker.discountPercent ?? null,
    });
    toast.success(saved ? "Removed from saved items" : "Added to saved items", {
      icon: saved ? "💔" : "❤️",
      duration: 2000,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group relative h-full"
    >
      <div className="relative h-full rounded-2xl bg-card border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-border hover:-translate-y-1">

        {/* Save Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSave}
          className={`absolute top-3 right-3 z-20 w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur-md transition-all duration-300 shadow-lg ${saved
              ? "bg-gradient-to-br from-red-500 to-rose-600 text-white border-0 shadow-red-500/25"
              : "bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800"
            }`}
          aria-label={saved ? "Remove from saved" : "Save item"}
        >
          <Heart
            className={`w-3.5 h-3.5 transition-all duration-300 ${saved ? "fill-current scale-110" : "hover:scale-110"
              }`}
          />
        </motion.button>

        <Link to={`/product/${sneaker.id}`} className="block h-full">
          {/* Image Container */}
          <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
            {!imageError && sneaker.image ? (
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
                )}
                <img
                  src={cardImage(sneaker.image)}
                  alt={sneaker.name}
                  className={`w-full h-full object-cover transition-all duration-700 ${imageLoaded
                      ? "scale-100 group-hover:scale-110"
                      : "scale-105 blur-sm"
                    }`}
                  loading="lazy"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    setImageError(true);
                    console.error("Image failed to load:", sneaker.image);
                  }}
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-6">
                <img
                  src={fallbackSvg}
                  alt={sneaker.category}
                  className="w-14 h-14 opacity-40 transition-opacity group-hover:opacity-60"
                />
              </div>
            )}

            {/* Quick Action Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-3 left-3 right-3">
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="w-full py-2 px-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 hover:bg-primary hover:text-white dark:hover:bg-primary transition-colors duration-200 shadow-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    // Add to cart functionality
                  }}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Quick Add
                </motion.button>
              </div>
            </div>

            {/* Badges Container */}
            <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
              {sneaker.sellerIsOfficial && (
                <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 shadow-lg shadow-purple-500/25 px-2 py-1 text-[9px] font-semibold tracking-wider flex items-center gap-1 backdrop-blur-sm">
                  <Sparkles className="w-2.5 h-2.5" />
                  OFFICIAL STORE
                </Badge>
              )}

              {!sneaker.sellerIsOfficial && sneaker.isBoosted && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-orange-500/25 px-2 py-1 text-[9px] font-semibold tracking-wider flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" />
                  FEATURED
                </Badge>
              )}

              {sneaker.discountPercent != null && sneaker.discountPercent > 0 && (
                <Badge className="bg-gradient-to-r from-red-500 to-rose-600 text-white border-0 shadow-lg shadow-red-500/25 px-2 py-1 text-[9px] font-bold tracking-wider">
                  {sneaker.discountPercent}% OFF
                </Badge>
              )}

              {sneaker.isNew && !sneaker.discountPercent && (
                <Badge className="bg-emerald-500 text-white border-0 shadow-lg shadow-emerald-500/25 px-2 py-1 text-[9px] font-semibold tracking-wider">
                  NEW ARRIVAL
                </Badge>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="p-3.5">
            {/* Brand */}
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 line-clamp-1">
              {sneaker.brand}
            </p>

            {/* Product Name */}
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 text-sm leading-snug line-clamp-2 mb-2.5">
              {sneaker.name}
            </h3>

            {/* Price and Verification Section */}
            <div className="flex items-end justify-between gap-2">
              <div className="flex flex-col">
                {discountedPrice ? (
                  <>
                    <span className="text-base font-bold text-foreground leading-tight">
                      GHS {discountedPrice.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-muted-foreground line-through">
                      GHS {sneaker.price.toLocaleString()}
                    </span>
                  </>
                ) : (
                  <span className="text-base font-bold text-foreground leading-tight">
                    GHS {sneaker.price.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Seller Verification Badges */}
              <div className="flex flex-col items-end gap-1">
                {sneaker.sellerIsOfficial && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 rounded-md border border-purple-500/20">
                    <Sparkles className="w-2.5 h-2.5 text-purple-500" />
                    <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 tracking-wide">
                      OFFICIAL
                    </span>
                  </div>
                )}

                {sneaker.sellerVerified && !sneaker.sellerIsOfficial && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                    <BadgeCheck className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wide">
                      VERIFIED
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
      </div>
    </motion.div>
  );
};

export default SneakerCard;