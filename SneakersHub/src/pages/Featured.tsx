import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Package, Search, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SneakerCard from "@/components/SneakerCard";
import { usePublicListings } from "@/context/PublicListingsContext";
import { Button } from "@/components/ui/button";

const Featured = () => {
  const { listings, loading } = usePublicListings();
  const [search, setSearch] = useState("");

  const now = Date.now();
  const isActiveBoost = (l: (typeof listings)[0]) => {
    if (!l.boosted) return false;
    if (!l.boostExpiresAt) return true; // official — no expiry
    return new Date(l.boostExpiresAt).getTime() > now;
  };

  // All actively boosted listings, newest boost first
  const featured = listings
    .filter(isActiveBoost)
    .filter((l) =>
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.brand.toLowerCase().includes(search.toLowerCase())
    );

  const toCardShape = (l: typeof listings[0]) => ({
    id: l.id,
    name: l.name,
    brand: l.brand,
    price: l.price,
    image: l.image ?? "",
    category: l.category,
    sizes: l.sizes,
    description: l.description,
    isBoosted: true,
    sellerVerified: l.sellerVerified,
    sellerIsOfficial: l.sellerIsOfficial,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="section-padding max-w-7xl mx-auto page-safe pb-20">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em] mb-2 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-500" /> Boosted Listings
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Featured Picks</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {loading
              ? "Loading..."
              : `${featured.length} ${featured.length === 1 ? "listing" : "listings"} currently featured`}
          </p>
        </motion.div>

        {/* Search */}
        <div className="relative max-w-md mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search featured sneakers..."
            className="w-full h-11 pl-10 pr-4 rounded-full border border-border bg-card text-sm text-foreground
              placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card h-56 sm:h-72 animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 border border-dashed border-border rounded-2xl">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-amber-500" />
            </div>
            <p className="font-display font-bold text-lg mb-1">
              {search ? `No results for "${search}"` : "No featured listings right now"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? "Try a different search term." : "Sellers can boost their listings to appear here."}
            </p>
            {search && (
              <Button variant="outline" className="rounded-full text-sm" onClick={() => setSearch("")}>
                Clear search
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            <AnimatePresence>
              {featured.map((l, i) => (
                <motion.div key={l.id} layout initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <SneakerCard sneaker={toCardShape(l)} index={i} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Featured;