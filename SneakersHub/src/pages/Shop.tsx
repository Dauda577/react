import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SneakerCard from "@/components/SneakerCard";
import { usePublicListings } from "@/context/PublicListingsContext";
import { Button } from "@/components/ui/button";
import { PRODUCT_CATEGORIES, CATEGORY_SVGS } from "@/data/sneakers";

const PAGE_SIZE = 30;

const GROUPED_PILLS: { label: string; svg: string; groupStart?: string }[] = [
  { label: "All", svg: "/categoryicons/all.svg" },
  ...PRODUCT_CATEGORIES.map((c, i, arr) => ({
    label: c.label,
    svg: c.svg,
    groupStart: i === 0 || c.group !== arr[i - 1].group ? c.group : undefined,
  })),
];

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Featured", value: "featured" },
];

const categoryHeading = (cat: string) => (cat === "All" ? "All Items" : cat);

const Shop = () => {
  const { listings, loading } = usePublicListings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(() => sessionStorage.getItem("shop_sort") ?? "newest");
  const [visibleCount, setVisibleCount] = useState(() => {
    const saved = sessionStorage.getItem("shop_visibleCount");
    return saved ? parseInt(saved, 10) : PAGE_SIZE;
  });

  const pillsRef = useRef<HTMLDivElement>(null);
  const prevFilters = useRef({ search: "", category: searchParams.get("category") ?? "All", sort });

  // Persist visibleCount and sort
  useEffect(() => {
    sessionStorage.setItem("shop_visibleCount", String(visibleCount));
  }, [visibleCount]);

  useEffect(() => {
    sessionStorage.setItem("shop_sort", sort);
  }, [sort]);

  // Restore scroll after listings load
  useEffect(() => {
    if (loading) return;
    const saved = sessionStorage.getItem("shop_scrollY");
    if (saved) {
      window.scrollTo(0, parseInt(saved, 10));
      sessionStorage.removeItem("shop_scrollY");
    }
  }, [loading]);

  // Save scroll before navigating away
  useEffect(() => {
    const handleUnload = () => {
      sessionStorage.setItem("shop_scrollY", String(window.scrollY));
    };
    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, []);

  const category = searchParams.get("category") ?? "All";

  const setCategory = (cat: string) => {
    const next = new URLSearchParams(searchParams);
    if (cat === "All") next.delete("category");
    else next.set("category", cat);
    setSearchParams(next, { replace: true });
    setVisibleCount(PAGE_SIZE);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setVisibleCount(PAGE_SIZE);
  };

  const handleSort = (val: string) => {
    setSort(val);
    setVisibleCount(PAGE_SIZE);
  };

  // Reset pagination only when filters actually change (not on back-navigation mount)
  useEffect(() => {
    const prev = prevFilters.current;
    const changed =
      prev.search !== search ||
      prev.category !== category ||
      prev.sort !== sort;

    if (changed) {
      prevFilters.current = { search, category, sort };
      // Don't reset on mount — only on genuine filter changes after mount
    }
  }, [search, category, sort]);

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

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const emptySvg = CATEGORY_SVGS[category] ?? "/categoryicons/all.svg";

  const scrollPills = (dir: "left" | "right") => {
    pillsRef.current?.scrollBy({ left: dir === "right" ? 200 : -200, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div
        className="section-padding max-w-7xl mx-auto pb-20"
        style={{ paddingTop: `calc(88px + env(safe-area-inset-top, 0px))` }}
      >
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em] mb-2">Browse</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            {categoryHeading(category)}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {loading
              ? "Loading..."
              : `${filtered.length} ${filtered.length === 1 ? "listing" : "listings"} available`}
          </p>
        </motion.div>

        {/* Category pills */}
        <div className="relative mb-5 group">
          <button
            onClick={() => scrollPills("left")}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10
              w-7 h-7 rounded-full bg-background border border-border shadow-sm items-center justify-center
              text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all
              opacity-0 group-hover:opacity-100"
            aria-label="Scroll categories left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={pillsRef}
            className="flex gap-2 overflow-x-auto pb-3 no-scrollbar items-center scroll-smooth"
          >
            {GROUPED_PILLS.map((pill, i) => {
              const showDivider = i > 1 && pill.groupStart !== undefined;
              return (
                <div key={pill.label} className="flex items-center gap-2 flex-shrink-0">
                  {showDivider && (
                    <span className="w-px h-5 bg-border rounded-full opacity-60 flex-shrink-0" />
                  )}
                  <button
                    onClick={() => setCategory(pill.label)}
                    className={`flex items-center gap-1.5 flex-shrink-0 px-3.5 py-1.5 rounded-full border text-sm font-medium transition-all
                      ${category === pill.label
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                  >
                    <img src={pill.svg} alt={pill.label} className="w-4 h-4" />
                    {pill.label}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => scrollPills("right")}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10
              w-7 h-7 rounded-full bg-background border border-border shadow-sm items-center justify-center
              text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all
              opacity-0 group-hover:opacity-100"
            aria-label="Scroll categories right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Search + Sort */}
        <div className="flex gap-3 mb-8 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search items or brands..."
              className="w-full h-11 pl-10 pr-4 rounded-full border border-border bg-card text-sm text-foreground
                placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
            {search && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => handleSort(e.target.value)}
            className="h-11 px-4 rounded-full border border-border bg-card text-sm text-foreground focus:outline-none focus:border-primary transition-all cursor-pointer"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card h-72 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              {search
                ? <Package className="w-7 h-7 text-primary" />
                : <img src={emptySvg} alt={category} className="w-7 h-7 text-primary" />}
            </div>
            <p className="font-display font-bold text-lg mb-1">No listings found</p>
            <p className="text-sm text-muted-foreground mb-4">
              {search
                ? `No results for "${search}"`
                : `No ${category === "All" ? "" : category + " "}items listed yet.`}
            </p>
            {(search || category !== "All") && (
              <Button
                variant="outline"
                className="rounded-full text-sm"
                onClick={() => { handleSearch(""); setCategory("All"); }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                  {visible.map((l, i) => (
                    <SneakerCard
                      key={l.id}
                      sneaker={{
                        id: l.id, name: l.name, brand: l.brand, price: l.price,
                        image: l.image ?? "", category: l.category, sizes: l.sizes,
                        description: l.description, isBoosted: l.boosted,
                        sellerVerified: l.sellerVerified, sellerIsOfficial: l.sellerIsOfficial,
                        discountPercent: l.discountPercent,
                        sellerId: l.sellerId,
                      }}
                      index={i}
                    />
                  ))}
                </div>

                {hasMore && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-2 mt-10"
                  >
                    <p className="text-xs text-muted-foreground">
                      Showing {visible.length} of {filtered.length} listings
                    </p>
                    <Button
                      variant="outline"
                      className="rounded-full px-8 h-11 text-sm font-semibold border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                      onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    >
                      Load more
                    </Button>
                  </motion.div>
                )}

                {!hasMore && filtered.length > PAGE_SIZE && (
                  <p className="text-center text-xs text-muted-foreground mt-10">
                    All {filtered.length} listings shown
                  </p>
                )}
              </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Shop;