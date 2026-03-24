import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Search, Zap, X } from "lucide-react";
import SneakerCard from "@/components/SneakerCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { usePublicListings } from "@/context/PublicListingsContext";
import { useMobile } from "@/hooks/useMobile";
import { useAuth } from "@/context/AuthContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FALLBACK_IMG = "/placeholder-sneaker.png";

const Animate = ({
  isMobile, children, className, ...props
}: { isMobile: boolean; children: React.ReactNode; className?: string; [k: string]: unknown }) =>
  isMobile
    ? <div className={className}>{children}</div>
    : <motion.div className={className} {...props}>{children}</motion.div>;

// ─── Data ────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: "Running",    emoji: "🏃" },
  { label: "Lifestyle",  emoji: "✨" },
  { label: "Basketball", emoji: "🏀" },
  { label: "Outdoor",    emoji: "🏔️" },
  { label: "Training",   emoji: "💪" },
  { label: "Other",      emoji: "👟" },
];

// ─── Search Dropdown ─────────────────────────────────────────────────────────

const SearchDropdown = ({
  results,
  query,
  onClose,
  onViewAll,
}: {
  results: { id: string; name: string; brand: string; price: number; image: string }[];
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
          <p className="text-xs text-muted-foreground">Try a different brand or model</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border max-h-[360px] overflow-y-auto">
            {results.map((item) => (
              <button
                key={item.id}
                onClick={() => { navigate(`/product/${item.id}`); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-xl bg-muted flex-shrink-0 overflow-hidden border border-border">
                  <img
                    src={item.image || FALLBACK_IMG}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                  />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.brand}</p>
                </div>
                {/* Price */}
                <p className="text-sm font-bold text-primary flex-shrink-0">
                  GHS {item.price.toLocaleString()}
                </p>
              </button>
            ))}
          </div>

          {/* View all footer */}
          <button
            onClick={onViewAll}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-sm font-medium text-foreground border-t border-border"
          >
            View all results for "{query}" <ArrowRight className="w-3.5 h-3.5" />
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

  // Filter listings based on query
  const searchResults = query.trim().length > 0
    ? listings
        .filter((l) => {
          const q = query.toLowerCase();
          return (
            l.name.toLowerCase().includes(q) ||
            l.brand.toLowerCase().includes(q) ||
            l.category?.toLowerCase().includes(q)
          );
        })
        .slice(0, 6)
        .map((l) => ({ id: l.id, name: l.name, brand: l.brand, price: l.price, image: l.image ?? "" }))
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Open dropdown whenever there's a query
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

  const featured    = listings.filter(isActiveBoost).slice(0, 6);
  const newArrivals = listings.filter((l) => !isActiveBoost(l)).slice(0, 6);
  const heroImage   = listings.find((l) => l.image)?.image ?? FALLBACK_IMG;

  const toCardShape = (l: typeof listings[0], isBoosted = false) => ({
    id: l.id, name: l.name, brand: l.brand, price: l.price, image: l.image ?? "",
    category: l.category, sizes: l.sizes, description: l.description, isBoosted,
    sellerVerified: l.sellerVerified, sellerIsOfficial: l.sellerIsOfficial,
  });

  const sellHref = user ? "/account?tab=settings" : "/auth";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      <Navbar />

      {/* ── HERO ── */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-6 lg:gap-8 items-center min-h-[85vh] lg:min-h-[90vh]"
        style={{ paddingTop: `calc(64px + env(safe-area-inset-top, 0px))` }}
      >
        {/* Left */}
        <Animate
          isMobile={isMobile}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-4 py-6 lg:py-12"
        >
          <span className="text-xs font-semibold tracking-[0.3em] uppercase text-muted-foreground">
            Ghana's Sneaker Marketplace
          </span>

          <h1 className="font-display text-[clamp(2.6rem,7vw,5rem)] font-bold leading-[1] tracking-[-0.03em] text-foreground">
            Find Your<br />
            <span className="italic font-light text-muted-foreground">next</span>{" "}
            Pair.
          </h1>

          {/* Search with live dropdown */}
          <div ref={searchRef} className="relative max-w-sm">
            <div className={`flex items-center gap-2 bg-muted rounded-full px-4 py-2.5 border transition-colors ${isDropdownOpen ? "border-primary" : "border-border"}`}>
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => { if (query.trim()) setIsDropdownOpen(true); }}
                placeholder="Brand, model, size…"
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
            {CATEGORIES.map((c) => (
              <Link
                key={c.label}
                to={`/shop?category=${c.label}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <span>{c.emoji}</span> {c.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4 pt-1">
            <Link to="/shop">
              <Button className="btn-primary rounded-full h-11 px-7 text-sm font-medium">
                Shop All <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link
              to={sellHref}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
            >
              Start selling →
            </Link>
          </div>

          {/* Micro stat */}
          <p className="text-xs text-muted-foreground">
            {listings.length > 0 ? `${listings.length} pairs listed` : "Be the first to list"}
            {" "}· Verified sellers · MoMo payouts
          </p>
        </Animate>

        {/* Right — desktop only */}
        {!isMobile && (
          <Animate
            isMobile={false}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-center justify-center"
          >
            <div className="relative w-full aspect-square max-w-lg">
              <div className="absolute inset-8 rounded-full bg-primary/10" />
              <img
                src={heroImage}
                alt="Featured sneaker"
                className="relative z-10 w-full h-full object-contain drop-shadow-2xl"
                onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
              />
              {featured[0] && (
                <div className="absolute top-6 right-6 z-20 bg-card border border-border rounded-2xl p-3 shadow-lg max-w-[140px]">
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-0.5">Featured</p>
                  <p className="text-xs font-bold text-foreground leading-tight truncate">{featured[0].name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">GHS {featured[0].price.toLocaleString()}</p>
                </div>
              )}
            </div>
          </Animate>
        )}
      </section>

      {/* ── FEATURED PICKS ── */}
      {(featured.length > 0 || loading) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 border-t border-border">
          <div className="flex items-end justify-between mb-5 sm:mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary mb-1 flex items-center gap-1.5">
                <Zap className="w-3 h-3 fill-current" /> Featured
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Picked for you</h2>
            </div>
            <Link to="/featured" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              See all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-muted h-52 sm:h-64 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
              {featured.map((l, i) => (
                <SneakerCard key={l.id} sneaker={toCardShape(l, true)} index={i} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── NEW ARRIVALS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 border-t border-border">
        <div className="flex items-end justify-between mb-5 sm:mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-1">Just Dropped</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">New Arrivals</h2>
          </div>
          <Link to="/shop" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            See all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-muted h-52 sm:h-64 animate-pulse" />
            ))}
          </div>
        ) : newArrivals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl font-display font-bold mb-2">Nothing here yet</p>
            <p className="text-sm text-muted-foreground mb-5">Be the first to list your sneakers.</p>
            <Link to={sellHref}>
              <Button className="btn-primary rounded-full h-11 px-7 text-sm">List a Pair</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
            {newArrivals.map((l, i) => (
              <SneakerCard key={l.id} sneaker={toCardShape(l)} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ── SELL BANNER ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
        <div className="rounded-3xl bg-foreground px-6 py-10 sm:py-14 md:px-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-primary mb-2">For sellers</p>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-background tracking-tight leading-tight">
              Got pairs<br />to move?
            </h2>
            <p className="text-background/50 text-sm mt-2 max-w-xs leading-relaxed">
              List in minutes. Reach buyers across Ghana. Get paid to MoMo.
            </p>
          </div>
          <Link to={sellHref} className="flex-shrink-0">
            <Button className="bg-primary text-primary-foreground hover:opacity-90 rounded-full h-11 px-7 text-sm font-semibold transition-opacity">
              Start Selling <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;