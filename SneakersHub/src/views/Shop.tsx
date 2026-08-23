"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Package, ChevronDown, Check, ChevronRight, Home } from "lucide-react";
import { useSearchParams } from "@/lib/router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SneakerCard from "@/components/ListingCard";
import { usePublicListings } from "@/context/PublicListingsContext";
import { Button } from "@/components/ui/button";
import {
  TAXONOMY, resolvePath, matchesUnder, matchesPath,
  type CategoryNode, type TaxonomyPath,
} from "@/data/taxonomy";

const PAGE_SIZE = 30;

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Featured", value: "featured" },
];

const Shop = () => {
  const { listings, loading } = usePublicListings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(() => sessionStorage.getItem("shop_sort") ?? "newest");
  const [visibleCount, setVisibleCount] = useState(() => {
    const saved = sessionStorage.getItem("shop_visibleCount");
    return saved ? parseInt(saved, 10) : PAGE_SIZE;
  });

  const sortRef = useRef<HTMLDivElement>(null);
  const [sortOpen, setSortOpen] = useState(false);

  const mainId = searchParams.get("main");
  const subId = searchParams.get("sub");
  const miniId = searchParams.get("mini");
  const path: TaxonomyPath | null = resolvePath(mainId, subId, miniId);

  // Close sort dropdown on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSortOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Persist visibleCount and sort
  useEffect(() => { sessionStorage.setItem("shop_visibleCount", String(visibleCount)); }, [visibleCount]);
  useEffect(() => { sessionStorage.setItem("shop_sort", sort); }, [sort]);

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
    const handleUnload = () => sessionStorage.setItem("shop_scrollY", String(window.scrollY));
    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, []);

  const setNode = (main: string | null, sub: string | null = null, mini: string | null = null) => {
    const next = new URLSearchParams(searchParams);
    if (main === null) { next.delete("main"); next.delete("sub"); next.delete("mini"); }
    else {
      next.set("main", main);
      if (sub === null) next.delete("sub");
      else next.set("sub", sub);
      if (mini === null) next.delete("mini");
      else next.set("mini", mini);
    }
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

  const now = new Date();
  const isActiveBoost = (l: (typeof listings)[0]) =>
    !!(l.boosted && l.boostExpiresAt && new Date(l.boostExpiresAt) > now);

  // Listings scoped to the current node (parents include children listings).
  const scoped = path
    ? listings.filter((l) => path.mini ? matchesPath(l, path) : matchesUnder(l, path))
    : listings;

  const filtered = scoped
    .filter((l) => {
      if (sort === "featured" && !isActiveBoost(l)) return false;
      const q = search.toLowerCase();
      const matchesSearch =
        l.name.toLowerCase().includes(q) ||
        l.brand.toLowerCase().includes(q) ||
        (l.description ?? "").toLowerCase().includes(q);
      return matchesSearch;
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

  // ── Node counts for tiles ──
  const countMain = (node: CategoryNode) => listings.filter((l) => l.category === node.label).length;
  const countSub = (node: CategoryNode) =>
    listings.filter((l) => l.category === path?.main.label && l.subcategory === node.label).length;
  const countMini = (node: CategoryNode) =>
    listings.filter((l) => path?.sub && l.subcategory === path.sub.label && l.subcategory2 === node.label).length;

  const mainNode = path?.main ?? null;
  const subNode = path?.sub ?? null;
  const showRootTiles = !mainNode;
  const showSubTiles = !!mainNode && !subNode;
  const showMiniTiles = !!mainNode && !!subNode && !miniId && (subNode?.children?.length ?? 0) > 0;

  const title = path?.mini?.label ?? path?.sub?.label ?? path?.main?.label ?? "All Categories";
  const subtitle = path?.main?.label ?? "Every item on the marketplace";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div
        className="section-padding pb-20"
        style={{ paddingTop: `calc(88px + env(safe-area-inset-top, 0px))` }}
      >
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 flex-wrap">
            <button
              onClick={() => setNode(null)}
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              All Categories
            </button>
            {mainNode && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                {subNode ? (
                  <button
                    onClick={() => setNode(mainNode.id)}
                    className="hover:text-foreground transition-colors"
                  >
                    {mainNode.label}
                  </button>
                ) : (
                  <span className="text-foreground font-medium">{mainNode.label}</span>
                )}
              </>
            )}
            {subNode && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                {path?.mini ? (
                  <button
                    onClick={() => setNode(mainNode!.id, subNode.id)}
                    className="hover:text-foreground transition-colors"
                  >
                    {subNode.label}
                  </button>
                ) : (
                  <span className="text-foreground font-medium">{subNode.label}</span>
                )}
              </>
            )}
            {path?.mini && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                <span className="text-foreground font-medium">{path.mini.label}</span>
              </>
            )}
          </nav>

          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {subtitle}
            {loading
              ? " · Loading..."
              : ` · ${filtered.length} ${filtered.length === 1 ? "listing" : "listings"}`}
          </p>
        </motion.div>

        {/* Search + Sort */}
        <div className="flex gap-3 mb-6 flex-wrap">
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
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setSortOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              className="h-11 px-4 rounded-full border border-border bg-card text-sm text-foreground
                focus:outline-none focus:border-primary transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
            >
              {sortOptions.find((o) => o.value === sort)?.label ?? "Newest"}
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${sortOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {sortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  role="listbox"
                  className="absolute right-0 top-full mt-2 z-20 min-w-[190px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
                >
                  {sortOptions.map((o) => (
                    <button
                      key={o.value}
                      role="option"
                      aria-selected={sort === o.value}
                      onClick={() => { handleSort(o.value); setSortOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between gap-2 transition-colors
                        ${sort === o.value
                          ? "text-primary font-medium bg-primary/5"
                          : "text-foreground hover:bg-secondary"
                        }`}
                    >
                      {o.label}
                      {sort === o.value && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Drill-down tiles ── */}
        {showRootTiles && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-10">
            {TAXONOMY.map((m) => (
              <button
                key={m.id}
                onClick={() => setNode(m.id)}
                className="group rounded-2xl border border-border overflow-hidden bg-card text-left
                  hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={m.img ?? "/categoryimages/other.jpg"}
                    alt={m.label}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-display font-semibold leading-tight">{m.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {countMain(m)} {countMain(m) === 1 ? "item" : "items"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {showSubTiles && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-10">
            {(mainNode?.children ?? []).map((s) => {
              const count = countSub(s);
              return (
                <button
                  key={s.id}
                  onClick={() => setNode(mainNode!.id, s.id)}
                  className="group flex items-center gap-3 p-4 rounded-2xl border border-border bg-card text-left
                    hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {s.icon ? (
                      <img src={s.icon} alt="" loading="lazy" className="w-7 h-7 object-contain" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-semibold leading-tight truncate">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {count} {count === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        {showMiniTiles && (
          <div className="flex flex-wrap gap-2 mb-8">
            {(subNode?.children ?? []).map((mini) => {
              const count = countMini(mini);
              return (
                <button
                  key={mini.id}
                  onClick={() => setNode(mainNode!.id, subNode!.id, mini.id)}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-all
                    ${count === 0
                      ? "border-border text-muted-foreground/60 cursor-default"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
                >
                  {mini.label}
                  <span className="ml-1.5 text-xs text-muted-foreground/60">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
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
              {search
                ? `No results for "${search}"`
                : `Nothing listed in ${title} yet.`}
            </p>
            {(search || path) && (
              <Button
                variant="outline"
                className="rounded-full text-sm"
                onClick={() => { handleSearch(""); setNode(null); handleSort("newest"); }}
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