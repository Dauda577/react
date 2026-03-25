import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Search, Zap, X, ShieldCheck, Truck, Wallet } from "lucide-react";
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

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "Verified Sellers", sub: "Every seller is reviewed" },
  { icon: Wallet,      label: "MoMo Payouts",     sub: "Get paid instantly" },
  { icon: Truck,       label: "Nationwide",        sub: "Delivery across Ghana" },
];

// ─── Search Dropdown ─────────────────────────────────────────────────────────

const SearchDropdown = ({
  results, query, onClose, onViewAll,
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
                <div className="w-12 h-12 rounded-xl bg-muted flex-shrink-0 overflow-hidden border border-border">
                  <img
                    src={item.image || FALLBACK_IMG}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.brand}</p>
                </div>
                <p className="text-sm font-bold text-primary flex-shrink-0">
                  GHS {item.price.toLocaleString()}
                </p>
              </button>
            ))}
          </div>
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
  const trustScrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobile();
  const { user } = useAuth();
  const navigate = useNavigate();

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

  // ── Auto-scroll trust pills on mobile ──
  useEffect(() => {
    const el = trustScrollRef.current;
    if (!el || !isMobile) return;

    let animFrame: number;
    let pos = 0;
    const speed = 0.5; // px per frame — adjust to taste

    const scroll = () => {
      pos += speed;
      // Reset to start once we've scrolled halfway (items are duplicated)
      if (pos >= el.scrollWidth / 2) pos = 0;
      el.scrollLeft = pos;
      animFrame = requestAnimationFrame(scroll);
    };

    animFrame = requestAnimationFrame(scroll);

    // Pause on touch so user can still manually browse
    const pause = () => cancelAnimationFrame(animFrame);
    const resume = () => { animFrame = requestAnimationFrame(scroll); };
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume, { passive: true });

    return () => {
      cancelAnimationFrame(animFrame);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, [isMobile]);

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
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-4 lg:gap-8 items-center lg:min-h-[90vh]"
        style={{ paddingTop: `calc(64px + env(safe-area-inset-top, 0px))` }}
      >
        {/* Left */}
        <Animate
          isMobile={isMobile}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-4 py-4 lg:py-12"
        >
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 w-fit">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-muted-foreground">
              Ghana's Sneaker Marketplace
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-[clamp(2.8rem,7vw,5.2rem)] font-bold leading-[0.95] tracking-[-0.03em] text-foreground">
            Find Your<br />
            <span className="italic font-light text-muted-foreground">next</span>{" "}
            Pair.
          </h1>

          {/* Sub-headline — adds context */}
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Buy and sell authentic sneakers in Ghana. Verified sellers, secure payments, MoMo payouts.
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
              >
                <span>{c.emoji}</span> {c.label}
              </Link>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-4">
            <Link to="/shop">
              <Button className="btn-primary rounded-full h-11 px-7 text-sm font-semibold shadow-md hover:shadow-lg transition-shadow">
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

          {/* Trust pills row — auto-scrolls on mobile, wraps on desktop */}
          <div
            ref={trustScrollRef}
            className="flex lg:flex-wrap gap-3 pt-1 overflow-x-auto lg:overflow-x-visible scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0"
          >
            {[...TRUST_ITEMS, ...TRUST_ITEMS].map(({ icon: Icon, label, sub }, i) => (
              <div key={`${label}-${i}`} className="flex items-center gap-2 bg-muted/60 border border-border rounded-xl px-3 py-2 flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-[11px] font-semibold text-foreground leading-none">{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
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
              {/* Soft glow backdrop */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-3xl" />
              <div className="absolute inset-8 rounded-full bg-primary/8" />
              <img
                src={heroImage}
                alt="Featured sneaker"
                className="relative z-10 w-full h-full object-contain drop-shadow-2xl"
                onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
              />
              {/* Floating card — only if we have a featured item */}
              {featured[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="absolute top-6 right-6 z-20 bg-card border border-border rounded-2xl p-3 shadow-xl max-w-[148px]"
                >
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-0.5 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 fill-current" /> Featured
                  </p>
                  <p className="text-xs font-bold text-foreground leading-tight truncate">{featured[0].name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">GHS {featured[0].price.toLocaleString()}</p>
                </motion.div>
              )}
              {/* Second floating badge — total listings */}
              {listings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="absolute bottom-10 left-4 z-20 bg-card border border-border rounded-2xl px-3 py-2 shadow-xl"
                >
                  <p className="text-[10px] text-muted-foreground">Available now</p>
                  <p className="text-sm font-bold text-foreground">{listings.length} Pairs</p>
                </motion.div>
              )}
            </div>
          </Animate>
        )}
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <section className="hidden sm:block border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Every seller verified</span>
          <span className="hidden sm:block text-border">|</span>
          <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-primary" /> Instant MoMo payouts</span>
          <span className="hidden sm:block text-border">|</span>
          <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-primary" /> Delivery nationwide</span>
          <span className="hidden sm:block text-border">|</span>
          <span className="flex items-center gap-1.5">🇬🇭 Built for Ghana</span>
        </div>
      </section>

      {/* ── FEATURED PICKS ── */}
      {(featured.length > 0 || loading) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
          <div className="flex items-end justify-between mb-4 sm:mb-8">
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
        <div className="flex items-end justify-between mb-4 sm:mb-8">
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
          <div className="text-center py-12 border border-dashed border-border rounded-3xl">
            <p className="text-4xl mb-3">👟</p>
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
        <div className="relative rounded-3xl bg-foreground px-6 py-10 sm:py-16 md:px-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden">
          {/* Decorative circle */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/10 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-primary/5 pointer-events-none" />

          <div className="relative z-10">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-primary mb-2">For sellers</p>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-background tracking-tight leading-tight">
              Got pairs<br />to move?
            </h2>
            <p className="text-background/50 text-sm mt-2 max-w-xs leading-relaxed">
              List in minutes. Reach buyers across Ghana. Get paid to MoMo — no cash, no stress.
            </p>
            {/* Mini stats inside banner */}
            <div className="flex gap-6 mt-4">
              <div>
                <p className="text-background text-lg font-bold leading-none">Free</p>
                <p className="text-background/40 text-xs mt-0.5">To list</p>
              </div>
              <div>
                <p className="text-background text-lg font-bold leading-none">Fast</p>
                <p className="text-background/40 text-xs mt-0.5">MoMo payouts</p>
              </div>
              <div>
                <p className="text-background text-lg font-bold leading-none">Safe</p>
                <p className="text-background/40 text-xs mt-0.5">Verified buyers</p>
              </div>
            </div>
          </div>

          <Link to={sellHref} className="relative z-10 flex-shrink-0">
            <Button className="bg-primary text-primary-foreground hover:opacity-90 rounded-full h-12 px-8 text-sm font-semibold transition-opacity shadow-lg">
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