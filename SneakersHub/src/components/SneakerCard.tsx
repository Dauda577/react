import { motion } from "framer-motion";
import { Sneaker } from "@/data/sneakers";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Heart, Zap, CheckCircle } from "lucide-react";
import { useSaved } from "@/context/SavedContext";
import { toast } from "sonner";

interface SneakerCardProps {
  sneaker: Sneaker & { isBoosted?: boolean; sellerVerified?: boolean };
  index: number;
}

const SneakerCard = ({ sneaker, index }: SneakerCardProps) => {
  const { toggleSaved, isSaved } = useSaved();
  const saved = isSaved(sneaker.id);

  const handleSave = () => {
    toggleSaved({
      id: sneaker.id,
      title: sneaker.name,
      price: `GHS ${sneaker.price}`,
      image: sneaker.image,
      brand: sneaker.brand,
    });
    toast.success(saved ? `${sneaker.name} removed from saved` : `${sneaker.name} added to saved`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative"
    >
      {/* Heart button */}
      <button
        onClick={handleSave}
        className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center
          backdrop-blur-sm border transition-all duration-200
          ${saved
            ? "bg-red-500/10 border-red-300 text-red-500"
            : "bg-background/70 border-border text-muted-foreground hover:text-red-400 hover:border-red-200"
          }`}
        aria-label={saved ? "Remove from saved" : "Save item"}
      >
        <motion.div
          key={saved ? "saved" : "unsaved"}
          initial={{ scale: 0.7 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <Heart className="w-4 h-4" fill={saved ? "currentColor" : "none"} />
        </motion.div>
      </button>

      <Link to={`/product/${sneaker.id}`} className="sneaker-card block group">
        <div className="relative aspect-square bg-secondary overflow-hidden flex items-center justify-center p-8">
          {sneaker.image
            ? <img src={sneaker.image} alt={sneaker.name} className="sneaker-image w-full h-full object-contain" loading="lazy" />
            : <span className="text-6xl">👟</span>
          }
          <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
            {sneaker.isBoosted && (
              <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] uppercase tracking-wider font-display flex items-center gap-1 border-0 shadow-md">
                <Zap className="w-2.5 h-2.5" /> Featured
              </Badge>
            )}
            {sneaker.isNew && (
              <Badge className="bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-display">
                New
              </Badge>
            )}
          </div>
        </div>
        <div className="p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">{sneaker.brand}</p>
          <h3 className="font-display font-semibold mt-1 text-foreground group-hover:text-primary transition-colors">
            {sneaker.name}
          </h3>
          <div className="flex items-center justify-between mt-2 gap-2">
            <p className="text-foreground font-display font-bold">GHS {sneaker.price}</p>
            {sneaker.sellerVerified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 flex-shrink-0">
                <CheckCircle className="w-2.5 h-2.5" /> Verified
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default SneakerCard;