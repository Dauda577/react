import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X, Package } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SneakerCard from "@/components/SneakerCard";
import { usePublicListings } from "@/context/PublicListingsContext";
import { Button } from "@/components/ui/button";

const categories = ["All", "Running", "Lifestyle", "Basketball", "Outdoor"];
const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Featured", value: "featured" },
];

const Shop = () => {
  const { listings, loading } = usePublicListings();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  const now = new Date();
  const isActiveBoost = (l: (typeof listings)[0]) =>
    !!l.boostedUntil && new Date(l.boostedUntil) > now;

  const filtered = listings
    .filter((l) => {
      const matchesCategory = category === "All" || l.category === category;
      const matchesSearch =
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.brand.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      const aFeatured = isActiveBoost(a) ? 1 : 0;
      const bFeatured = isActiveBoost(b) ? 1 : 0;
      if (bFeatured !== aFeatured) return bFeatured - aFeatured;
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="section-padding max-w-7xl mx-auto pt-28 pwa-offset-28 pb-20">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em] mb-2">Browse</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">All Sneakers</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {loading ? "Loading..." : `${filtered.length} ${filtered.length === 1 ? "listing" : "listings"} available`}
          </p>
        </motion.div>

        {/* Search + Filter bar */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sneakers or brands..."
              className="w-full h-11 pl-10 pr-4 rounded-full border border-border bg-card text-sm text-foreground
                placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-11 px-4 rounded-full border border-border bg-card text-sm text-foreground
              focus:outline-none focus:border-primary transition-all cursor-pointer"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`h-11 px-4 rounded-full border text-sm font-medium flex items-center gap-2 transition-all
              ${showFilters ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>

        {/* Category pills */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="flex flex-wrap gap-2 pb-2">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-all
                      ${category === cat
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card h-72 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-primary" />
            </div>
            <p className="font-display font-bold text-lg mb-1">No listings found</p>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? `No results for "${search}"` : "No sneakers in this category yet."}
            </p>
            {(search || category !== "All") && (
              <Button variant="outline" className="rounded-full text-sm" onClick={() => { setSearch(""); setCategory("All"); }}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            <AnimatePresence>
              {filtered.map((l, i) => (
                <motion.div key={l.id} layout initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <SneakerCard sneaker={{
                    id: l.id,
                    name: l.name,
                    brand: l.brand,
                    price: l.price,
                    image: l.image ?? "",
                    category: l.category,
                    sizes: l.sizes,
                    description: l.description,
                    isBoosted: l.boosted,
                    sellerVerified: l.sellerVerified,
                    sellerIsOfficial: l.sellerIsOfficial,
                  }} index={i} />
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

export default Shop;