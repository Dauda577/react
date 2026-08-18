"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "@/lib/router";
import {
  ArrowRight, Search, X, MapPin, Phone, Tag,
  BadgeCheck, Package, LayoutGrid,
  MessageCircle, BadgePercent, ShieldCheck,
} from "lucide-react";
import SneakerCard from "@/components/ListingCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { usePublicListings } from "@/context/PublicListingsContext";
import { useAuth } from "@/context/AuthContext";

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: "Sneakers",     svg: "/categoryicons/sneakers.svg",     color: "from-blue-500/20 to-blue-600/20" },
  { label: "Phones",       svg: "/categoryicons/phones.svg",       color: "from-green-500/20 to-green-600/20" },
  { label: "Clothes",      svg: "/categoryicons/tops.svg",         color: "from-pink-500/20 to-pink-600/20" },
  { label: "Bags",         svg: "/categoryicons/bags.svg",         color: "from-amber-500/20 to-amber-600/20" },
  { label: "Electronics",  svg: "/categoryicons/electronics.svg",  color: "from-violet-500/20 to-violet-600/20" },
  { label: "Accessories",  svg: "/categoryicons/accessories.svg",  color: "from-emerald-500/20 to-emerald-600/20" },
  { label: "Watches",      svg: "/categoryicons/watches.svg",      color: "from-sky-500/20 to-sky-600/20" },
  { label: "Furniture",    svg: "/categoryicons/furniture.svg",    color: "from-orange-500/20 to-orange-600/20" },
];

const TRUST_ITEMS = [
  {
    icon: MessageCircle,
    title: "Direct contact",
    sub: "Reach sellers on WhatsApp or call — no middleman.",
  },
  {
    icon: BadgePercent,
    title: "No fees",
    sub: "Free to list and free to buy. Always.",
  },
  {
    icon: ShieldCheck,
    title: "Verified & official",
    sub: "Trusted seller badges on every card.",
  },
];

const HOW_IT_WORKS = [
  {
    icon: Tag,
    label: "Post for free",
    sub: "List anything in seconds. No fees, no commissions.",
  },
  {
    icon: Phone,
    label: "Buyers contact you",
    sub: "They reach you directly via WhatsApp or call.",
  },
  {
    icon: MapPin,
    label: "Meet or deliver",
    sub: "Sort out pickup or delivery on your terms.",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

const Index = () => {
  const { listings, loading } = usePublicListings();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [visible, setVisible] = useState(24);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setVisible(24);
  }, [activeCategory, query]);

  const now = Date.now();
  const isActiveBoost = (l: typeof listings[0]) => {
    if (!l.boosted) return false;
    if (!l.boostExpiresAt) return true;
    return new Date(l.boostExpiresAt).getTime() > now;
  };

  // Boosted first, then newest. Filtered by query + category.
  const filtered = listings
    .filter((l) => {
      if (activeCategory && l.category !== activeCategory) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const matches =
          l.name?.toLowerCase().includes(q) ||
          l.category?.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aBoost = isActiveBoost(a) ? 1 : 0;
      const bBoost = isActiveBoost(b) ? 1 : 0;
      if (aBoost !== bBoost) return bBoost - aBoost;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

  // Live marketplace stats (Alibaba "verified manufacturers" band)
  const stats = useMemo(() => {
    const verified = new Set(
      listings
        .filter((l) => l.sellerVerified || l.sellerIsOfficial)
        .map((l) => l.sellerId),
    ).size;
    const categories = new Set(listings.map((l) => l.category)).size;
    return [
      { icon: BadgeCheck, value: `${verified}+`, label: "Verified sellers" },
      { icon: Package, value: listings.length.toLocaleString(), label: "Live listings" },
      { icon: LayoutGrid, value: categories, label: "Categories" },
    ];
  }, [listings]);

  const toCardShape = (l: typeof listings[0], isBoosted = false) => ({
    id: l.id,
    name: l.name,
    brand: l.category ?? "",
    price: l.price,
    image: l.image ?? "",
    category: l.category,
    sizes: l.sizes,
    description: l.description,
    isBoosted,
    sellerId: l.sellerId,
    sellerName: l.sellerName,
    sellerVerified: l.sellerVerified,
    sellerIsOfficial: l.sellerIsOfficial,
  });

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const handleReset = () => {
    setQuery("");
    setActiveCategory(null);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const selectCategory = (label: string | null) => {
    setActiveCategory((prev) => (prev === label ? null : label));
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const postHref = user ? "/sell" : "/auth";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      <Navbar />

      {/* ── Search (Alibaba focal search) ── */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ paddingTop: `calc(64px + env(safe-area-inset-top, 0px))` }}
      >
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 bg-card rounded-full px-5 py-3.5 border border-border shadow-lg shadow-primary/5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all max-w-2xl mx-auto"
        >
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you looking for?"
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button type="button" onClick={handleClear} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </section>

      {/* ── Categories for you (icon tiles) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground text-center mb-4">
          Categories for you
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
          {CATEGORIES.map((c) => {
            const active = activeCategory === c.label;
            return (
              <button
                key={c.label}
                onClick={() => selectCategory(c.label)}
                className="flex flex-col items-center gap-2 group"
              >
                <span
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${c.color} border flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-primary/50 ${
                    active ? "border-primary ring-2 ring-primary/30" : "border-border/60"
                  }`}
                >
                  <img
                    src={c.svg}
                    alt=""
                    className="w-8 h-8 sm:w-9 sm:h-9"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                </span>
                <span
                  className={`text-[11px] sm:text-xs font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Marketplace stats band ── */}
      <section className="mt-10 border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-3 divide-x divide-border">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 px-2">
                <Icon className="w-4 h-4 text-primary mb-1" />
                <span className="font-display text-xl sm:text-2xl font-bold text-foreground leading-none">
                  {value}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground text-center">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TRUST_ITEMS.map(({ icon: Icon, title, sub }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-2xl bg-card border border-border/60 p-4"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground mb-0.5">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Dense product grid ── */}
      <section ref={gridRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 scroll-mt-24">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight">
            {activeCategory ? activeCategory : "All Products"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {loading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "item" : "items"}`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
            {[...Array(10)].map((_, i) => <div key={i} className="rounded-2xl bg-muted h-44 sm:h-56 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-3xl">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-xl font-display font-bold mb-2">No products found</p>
            <p className="text-sm text-muted-foreground mb-5">Try a different search or category.</p>
            <Button variant="outline" className="rounded-full h-10 px-6 text-sm" onClick={handleReset}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
            {filtered.slice(0, visible).map((l, i) => (
              <SneakerCard key={l.id} sneaker={toCardShape(l, isActiveBoost(l))} index={i} />
            ))}
          </div>
        )}

        {filtered.length > visible && (
          <div className="flex justify-center mt-8">
            <Button variant="outline" className="rounded-full h-10 px-8 text-sm" onClick={() => setVisible((v) => v + 24)}>
              Load more
            </Button>
          </div>
        )}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 border-t border-border">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-2">Simple</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">How it works</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-3xl mx-auto">
          {HOW_IT_WORKS.map(({ icon: Icon, label, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex flex-col items-center text-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground mb-1">{label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex justify-center mt-8">
          <Link to={postHref}>
            <Button className="btn-primary rounded-full h-11 px-8 text-sm font-semibold">
              Post for free <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;