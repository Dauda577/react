import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { itemVariant } from "../Account/accountHelpers";

interface SavedItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string | null;
  category: string;
  sizes: number[];
  description: string;
  sellerVerified: boolean;
  sellerIsOfficial: boolean;
  isBoosted: boolean;
}

interface Props {
  saved: SavedItem[];
  toggleSaved: (item: SavedItem) => void;
}

const AccountSaved = memo(({ saved, toggleSaved }: Props) => {
  if (saved.length === 0) return (
    <div className="text-center py-20">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Heart className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-display text-lg font-bold tracking-tight mb-2">Nothing saved</h3>
      <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
        Save listings you like to find them later.
      </p>
      <Link to="/shop">
        <Button className="btn-primary rounded-full h-9 px-6 text-sm">
          Browse <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
        </Button>
      </Link>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {saved.length} saved {saved.length === 1 ? "item" : "items"}
        </p>
        <Link to="/shop">
          <Button variant="outline" className="rounded-full h-8 px-4 text-xs">
            Browse more <ArrowRight className="ml-1 w-3 h-3" />
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {saved.map((item, i) => (
            <motion.div key={item.id} {...itemVariant(i)}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-border hover:bg-primary/5 transition-colors group">
              <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden flex-shrink-0">
                {item.image
                  ? <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
                  : <div className="w-full h-full bg-primary/10 flex items-center justify-center text-lg">🛍️</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                {item.brand && (
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium mb-0.5">{item.brand}</p>
                )}
                <p className="font-medium text-sm truncate">{item.name}</p>
                <p className="font-display font-bold text-sm text-primary mt-0.5">GHS {item.price.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link to={`/product/${item.id}`}>
                  <button className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-colors">
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </Link>
                <button
                  onClick={() => toggleSaved(item)}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-red-500/10 hover:border-red-300 transition-colors"
                >
                  <Heart className="w-3.5 h-3.5 text-red-400" fill="currentColor" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});

AccountSaved.displayName = "AccountSaved";
export default AccountSaved;