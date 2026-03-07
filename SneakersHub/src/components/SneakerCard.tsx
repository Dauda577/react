import { motion } from "framer-motion";
import { Sneaker } from "@/data/sneakers";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface SneakerCardProps {
  sneaker: Sneaker;
  index: number;
}

const SneakerCard = ({ sneaker, index }: SneakerCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link to={`/product/${sneaker.id}`} className="sneaker-card block group">
        <div className="relative aspect-square bg-secondary overflow-hidden flex items-center justify-center p-8">
          <img
            src={sneaker.image}
            alt={sneaker.name}
            className="sneaker-image w-full h-full object-contain"
            loading="lazy"
          />
          <div className="absolute top-3 left-3 flex gap-2">
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
          <p className="text-foreground font-display font-bold mt-2">${sneaker.price}</p>
        </div>
      </Link>
    </motion.div>
  );
};

export default SneakerCard;