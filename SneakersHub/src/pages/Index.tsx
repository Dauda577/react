import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Search, Zap } from "lucide-react";
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

// ─── Component ───────────────────────────────────────────────────────────────

const Index = () => {
  const { listings, loading } = usePublicListings();
  const [query, setQuery] = useState("");
  const isMobile = useMobile();
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
  };

  const sellHref = user ? "/account?tab=settings" : "/auth";

  return (
    <div className="min-h-screen bg-white overflow-x-hidden w-full">
      <Navbar />

      {/* ── HERO ── */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-8 items-center min-h-[90vh]"
        style={{ paddingTop: `calc(80px + env(safe-area-inset-top, 0px))` }}
      >
        {/* Left: copy */}
        <Animate
          isMobile={isMobile}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-6 py-12"
        >
          <span className="text-xs font-semibold tracking-[0.3em] uppercase text-zinc-400">
            Ghana's Sneaker Marketplace
          </span>

          <h1 className="font-display text-[clamp(2.8rem,6vw,5rem)] font-bold leading-[1] tracking-[-0.03em] text-zinc-950">
            Find Your<br />
            <span className="italic font-light text-zinc-400">next</span>{" "}
            Pair.
          </h1>

          {/* Search */}
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 bg-zinc-100 rounded-full px-5 py-3 max-w-sm"
          >
            <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Brand, model, size…"
              className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 outline-none"
            />
            <button
              type="submit"
              className="bg-zinc-950 text-white rounded-full text-[11px] font-semibold px-4 py-1.5 hover:bg-zinc-700 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Link
                key={c.label}
                to={`/shop?category=${c.label}`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-zinc-200 text-xs font-medium text-zinc-600 hover:border-zinc-950 hover:text-zinc-950 transition-colors"
              >
                <span>{c.emoji}</span> {c.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4 pt-2">
            <Link to="/shop">
              <Button className="bg-zinc-950 text-white hover:bg-zinc-700 rounded-full h-11 px-7 text-sm font-medium">
                Shop All <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link
              to={sellHref}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-950 transition-colors underline underline-offset-4"
            >
              Start selling →
            </Link>
          </div>

          {/* Micro stat line */}
          <p className="text-xs text-zinc-400">
            {listings.length > 0 ? `${listings.length} pairs listed` : "Be the first to list"}
            {" "}· Verified sellers · MoMo payouts
          </p>
        </Animate>

        {/* Right: hero sneaker */}
        {!isMobile && (
          <Animate
            isMobile={false}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-center justify-center"
          >
            <div className="relative w-full aspect-square max-w-lg">
              <div className="absolute inset-8 rounded-full bg-zinc-100" />
              <img
                src={heroImage}
                alt="Featured sneaker"
                className="relative z-10 w-full h-full object-contain drop-shadow-2xl"
                onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
              />
              {/* Floating info card */}
              {featured[0] && (
                <div className="absolute top-6 right-6 z-20 bg-white border border-zinc-100 rounded-2xl p-3 shadow-lg max-w-[140px]">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-0.5">Featured</p>
                  <p className="text-xs font-bold text-zinc-950 leading-tight truncate">{featured[0].name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">GHS {featured[0].price.toLocaleString()}</p>
                </div>
              )}
            </div>
          </Animate>
        )}
      </section>

      {/* ── FEATURED PICKS ── */}
      {(featured.length > 0 || loading) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-zinc-100">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> Featured
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-zinc-950">Picked for you</h2>
            </div>
            <Link
              to="/featured"
              className="text-sm text-zinc-400 hover:text-zinc-950 transition-colors flex items-center gap-1"
            >
              See all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-zinc-100 h-64 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {featured.map((l, i) => (
                <SneakerCard key={l.id} sneaker={toCardShape(l, true)} index={i} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── NEW ARRIVALS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-zinc-100">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400 mb-1.5">Just Dropped</p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-zinc-950">New Arrivals</h2>
          </div>
          <Link
            to="/shop"
            className="text-sm text-zinc-400 hover:text-zinc-950 transition-colors flex items-center gap-1"
          >
            See all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-zinc-100 h-64 animate-pulse" />
            ))}
          </div>
        ) : newArrivals.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-2xl font-display font-bold text-zinc-950 mb-2">Nothing here yet</p>
            <p className="text-sm text-zinc-400 mb-6">Be the first to list your sneakers.</p>
            <Link to={sellHref}>
              <Button className="bg-zinc-950 text-white hover:bg-zinc-700 rounded-full h-11 px-7 text-sm">
                List a Pair
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {newArrivals.map((l, i) => (
              <SneakerCard key={l.id} sneaker={toCardShape(l)} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ── SELL BANNER ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-3xl bg-zinc-950 px-8 py-14 md:px-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-zinc-500 mb-3">For sellers</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
              Got pairs<br />to move?
            </h2>
            <p className="text-zinc-400 text-sm mt-3 max-w-xs leading-relaxed">
              List in minutes. Reach buyers across Ghana. Get paid to MoMo.
            </p>
          </div>
          <Link to={sellHref} className="flex-shrink-0">
            <Button className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-full h-12 px-8 text-sm font-semibold">
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