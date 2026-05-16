import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Search, Zap, X, MapPin, Phone, Tag, TrendingUp,
} from "lucide-react";
import SneakerCard from "@/components/ListingCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { usePublicListings } from "@/context/PublicListingsContext";
import { useMobile } from "@/hooks/useMobile";
import { useAuth } from "@/context/AuthContext";

// ─── Constants ───────────────────────────────────────────────────────────────

const FALLBACK_IMG = "/placeholder-sneaker.png";

const HERO_CATEGORIES = [
  { label: "Sneakers",     svg: "/categoryicons/sneakers.svg" },
  { label: "Phones",       svg: "/categoryicons/phones.svg" },
  { label: "Clothes",      svg: "/categoryicons/tops.svg" },
  { label: "Bags",         svg: "/categoryicons/bags.svg" },
  { label: "Electronics",  svg: "/categoryicons/electronics.svg" },
  { label: "Accessories",  svg: "/categoryicons/accessories.svg" },
  { label: "Watches",      svg: "/categoryicons/watches.svg" },
  { label: "Furniture",    svg: "/categoryicons/furniture.svg" },
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const Animate = ({
  isMobile, children, className, ...props
}: { isMobile: boolean; children: React.ReactNode; className?: string; [k: string]: unknown }) =>
  isMobile
    ? <div className={className}>{children}</div>
    : <motion.div className={className} {...props}>{children}</motion.div>;

// ─── Search Dropdown ─────────────────────────────────────────────────────────

const SearchDropdown = ({
  results, query, onClose, onViewAll,
}: {
  results: { id: string; title: string; category: string; price: number; image: string }[];
  query: string;
  onClose: () => void;
  onViewAll: () => void;
}) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50"
    >
      {results.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm font-medium text-foreground mb-0.5">No results for "{query}"</p>
          <p className="text-xs text-muted-foreground">Try a different keyword or category</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border max-h-[360px] overflow-y-auto">
            {results.map((item) => (
              <button
                key={item.id}
                onClick={() => { navigate(`/listing/${item.id}`); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex-shrink-0 overflow-hidden border border-border">
                  <img
                    src={item.image || FALLBACK_IMG}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                </div>
                <p className="text-sm font-bold text-primary flex-shrink-0">
                  GH₵ {item.price.toLocaleString()}
                </p>
              </button>
            ))}
          </div>
          <button
            onClick={onViewAll}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-sm font-medium text-foreground border-t border-border"
          >
            See all results for "{query}" <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </motion.div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

const Index = () => {
  const { listings, loading } = usePublicListings();
  const [query, setQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMobile();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search
  const searchResults = query.trim().length > 0
    ? listings
        .filter((l) => {
          const q = query.toLowerCase();
          return (
            l.name?.toLowerCase().includes(q) ||
            l.title?.toLowerCase().includes(q) ||
            l.category?.toLowerCase().includes(q) ||
            l.description?.toLowerCase().includes(q)
          );
        })
        .slice(0, 6)
        .map((l) => ({
          id: l.id,
          title: l.title ?? l.name,
          category: l.category ?? "",
          price: l.price,
          image: l.image ?? "",
        }))
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsDropdownOpen(query.trim().length > 0);
  }, [query]);

  const handleViewAll = () => {
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
    setIsDropdownOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  const now = Date.now();
  const isActiveBoost = (l: typeof listings[0]) => {
    if (!l.boosted) return false;
    if (!l.boostExpiresAt) return true;
    return new Date(l.boostExpiresAt).getTime() > now;
  };

  // Boosted = featured at top
  const featured = listings.filter(isActiveBoost).slice(0, 12);

  // Recent listings (non-boosted, sorted by created_at desc)
  const recentListings = [...listings]
    .filter((l) => !isActiveBoost(l))
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 12);

  const toCardShape = (l: typeof listings[0], isBoosted = false) => ({
    id: l.id,
    name: l.title ?? l.name,
    brand: l.category ?? "",
    price: l.price,
    image: l.image ?? "",
    category: l.category,
    sizes: l.sizes,
    description: l.description,
    isBoosted,
    sellerId: l.sellerId,
  });

  const postHref = user ? "/sell" : "/auth";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      <Navbar />

      {/* ── HERO ── */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-4 lg:gap-8 items-center lg:min-h-[88vh]"
        style={{ paddingTop: `calc(64px + env(safe-area-inset-top, 0px))` }}
      >
        <Animate
          isMobile={isMobile}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-4 py-6 lg:py-14"
        >
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 w-fit">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-muted-foreground">
              Ghana's Classifieds
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-[clamp(2.6rem,7vw,5rem)] font-bold leading-[0.95] tracking-[-0.03em] text-foreground">
            Buy & Sell<br />
            <span className="italic font-light text-muted-foreground">anything</span>{" "}
            local.
          </h1>

          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            List phones, clothes, sneakers, electronics & more. Free to post. Buyers contact you directly — no middleman, no fees.
          </p>

          {/* Search */}
          <div ref={searchRef} className="relative max-w-sm">
            <div className={`flex items-center gap-2 bg-muted rounded-full px-4 py-3 border transition-colors ${isDropdownOpen ? "border-primary" : "border-border"}`}>
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => { if (query.trim()) setIsDropdownOpen(true); }}
                placeholder="Search listings…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {query && (
                <button onClick={handleClear} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <AnimatePresence>
              {isDropdownOpen && (
                <SearchDropdown
                  results={searchResults}
                  query={query}
                  onClose={() => setIsDropdownOpen(false)}
                  onViewAll={handleViewAll}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {HERO_CATEGORIES.map((c) => (
              <Link
                key={c.label}
                to={`/shop?category=${c.label}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
              >
                <img src={c.svg} alt={c.label} className="w-4 h-4" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                {c.label}
              </Link>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-4">
            <Link to={postHref}>
              <Button className="btn-primary rounded-full h-11 px-7 text-sm font-semibold shadow-md hover:shadow-lg transition-shadow">
                Post a Listing <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link
              to="/shop"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
            >
              Browse all →
            </Link>
          </div>

          {/* How it works — inline badges */}
          <div className="flex flex-wrap gap-3 pt-1">
            {HOW_IT_WORKS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 bg-muted/60 border border-border rounded-xl px-3 py-2">
                <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <p className="text-[11px] font-semibold text-foreground leading-none">{label}</p>
              </div>
            ))}
          </div>
        </Animate>

        {/* Right — desktop hero visual */}
        {!isMobile && (
          <Animate
            isMobile={false}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-center justify-center"
          >
            <div className="relative w-full aspect-square max-w-lg">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-3xl" />
              <div className="absolute inset-8 rounded-full bg-primary/8" />

              {/* Mosaic of recent listing images */}
              <div className="relative z-10 w-full h-full grid grid-cols-2 gap-3 p-8">
                {listings.filter((l) => l.image).slice(0, 4).map((l, i) => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                    className="rounded-2xl overflow-hidden border border-border bg-muted"
                  >
                    <img
                      src={l.image ?? FALLBACK_IMG}
                      alt={l.title ?? l.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                    />
                  </motion.div>
                ))}
                {/* Pad with placeholder tiles if < 4 images */}
                {Array.from({ length: Math.max(0, 4 - listings.filter((l) => l.image).slice(0, 4).length) }).map((_, i) => (
                  <div key={`pad-${i}`} className="rounded-2xl bg-muted border border-border animate-pulse" />
                ))}
              </div>

              {/* Floating stat card */}
              {listings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="absolute bottom-10 left-4 z-20 bg-card border border-border rounded-2xl px-3 py-2 shadow-xl"
                >
                  <p className="text-[10px] text-muted-foreground">Active listings</p>
                  <p className="text-sm font-bold text-foreground">{listings.length} Items</p>
                </motion.div>
              )}

              {/* Floating boost card */}
              {featured[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="absolute top-6 right-6 z-20 bg-card border border-border rounded-2xl p-3 shadow-xl max-w-[148px]"
                >
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-0.5 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 fill-current" /> Boosted
                  </p>
                  <p className="text-xs font-bold text-foreground leading-tight truncate">{featured[0].title ?? featured[0].name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">GH₵ {featured[0].price.toLocaleString()}</p>
                </motion.div>
              )}
            </div>
          </Animate>
        )}
      </section>

      {/* ── INFO STRIP ── */}
      <section className="hidden sm:block border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-primary" /> Free to list, always</span>
          <span className="hidden sm:block text-border">|</span>
          <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-primary" /> Contact via WhatsApp or call</span>
          <span className="hidden sm:block text-border">|</span>
          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" /> Location-based feed</span>
          <span className="hidden sm:block text-border">|</span>
          <span className="flex items-center gap-1.5">🇬🇭 Built for Ghana</span>
        </div>
      </section>

      {/* ── FEATURED / BOOSTED ── */}
      {(featured.length > 0 || loading) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
          <div className="flex items-end justify-between mb-4 sm:mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary mb-1 flex items-center gap-1.5">
                <Zap className="w-3 h-3 fill-current" /> Boosted
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Featured Listings</h2>
            </div>
            <Link to="/featured" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              See all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {[...Array(4)].map((_, i) => <div key={i} className="rounded-2xl bg-muted h-52 sm:h-64 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {featured.map((l, i) => <SneakerCard key={l.id} sneaker={toCardShape(l, true)} index={i} />)}
            </div>
          )}
        </section>
      )}

      {/* ── RECENT LISTINGS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 border-t border-border">
        <div className="flex items-end justify-between mb-4 sm:mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" /> Fresh
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Just Posted</h2>
          </div>
          <Link to="/shop" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            See all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {[...Array(4)].map((_, i) => <div key={i} className="rounded-2xl bg-muted h-52 sm:h-64 animate-pulse" />)}
          </div>
        ) : recentListings.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-3xl">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-xl font-display font-bold mb-2">Nothing here yet</p>
            <p className="text-sm text-muted-foreground mb-5">Be the first to post a listing.</p>
            <Link to={postHref}>
              <Button className="btn-primary rounded-full h-11 px-7 text-sm">Post Something</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {recentListings.map((l, i) => (
              <SneakerCard key={l.id} sneaker={toCardShape(l, false)} index={i} />
            ))}
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