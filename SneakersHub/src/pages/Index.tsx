import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Truck, Shield, RotateCcw, Zap, Star,
  Users, TrendingUp, ShoppingBag, ListPlus, CreditCard, PackageCheck,
} from "lucide-react";
import SneakerCard from "@/components/SneakerCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { usePublicListings } from "@/context/PublicListingsContext";
import { supabase } from "@/lib/supabase";
import { useMobile } from "@/hooks/useMobile";
import { useAuth } from "@/context/AuthContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Renders children inside motion.div on desktop, plain div on mobile */
const Animate = ({
  isMobile,
  children,
  className,
  ...motionProps
}: {
  isMobile: boolean;
  children: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}) =>
  isMobile ? (
    <div className={className}>{children}</div>
  ) : (
    <motion.div className={className} {...motionProps}>
      {children}
    </motion.div>
  );

// ─── Assets ──────────────────────────────────────────────────────────────────

const FALLBACK_IMG = "/placeholder-sneaker.png"; // swap with your actual fallback

const SneakerOutline = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 44 C8 44 12 28 28 24 C38 21 46 26 56 24 C66 22 72 16 80 14 C90 12 98 16 104 22 C110 28 112 36 110 42 C108 46 104 48 100 48 L16 48 C12 48 8 46 8 44Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M28 24 C28 24 32 32 40 34 C48 36 56 32 56 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M56 24 C56 24 60 30 68 30 C74 30 78 26 80 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M8 40 L110 40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <ellipse cx="22" cy="48" rx="8" ry="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <ellipse cx="98" cy="48" rx="8" ry="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="M14 44 L106 44" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeDasharray="3 3"/>
  </svg>
);

// ─── Data ────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: "Running",    emoji: "🏃", color: "from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-600" },
  { label: "Lifestyle",  emoji: "✨", color: "from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-600" },
  { label: "Basketball", emoji: "🏀", color: "from-orange-500/10 to-orange-500/5 border-orange-500/20 text-orange-600" },
  { label: "Outdoor",    emoji: "🏔️", color: "from-green-500/10 to-green-500/5 border-green-500/20 text-green-600" },
  { label: "Training",   emoji: "💪", color: "from-red-500/10 to-red-500/5 border-red-500/20 text-red-600" },
  { label: "Other",      emoji: "👟", color: "from-zinc-500/10 to-zinc-500/5 border-zinc-500/20 text-zinc-600" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: ListPlus,
    title: "List Your Sneakers",
    desc: "Create a listing in minutes. Add photos, set your price, and choose your sizes. Your pair goes live instantly.",
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    step: "02",
    icon: CreditCard,
    title: "Buyer Pays Securely",
    desc: "Buyers pay upfront through our platform. Funds are held safely until the order is confirmed — no scams.",
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    step: "03",
    icon: PackageCheck,
    title: "Ship & Get Paid",
    desc: "Ship the sneakers, buyer confirms receipt, and payment is released straight to your MoMo. Simple.",
    color: "text-green-500",
    bg: "bg-green-500/10 border-green-500/20",
  },
];

const TRUST_ITEMS = [
  { icon: Truck,    label: "Fast Delivery",     desc: "Across all regions in Ghana" },
  { icon: Shield,   label: "Verified Sellers",  desc: "Every seller reviewed & approved" },
  { icon: RotateCcw, label: "Buyer Protection", desc: "Two-sided order confirmation" },
];

const STAT_ITEMS = (listingCount: number) => [
  { icon: Users,      val: `${listingCount}+`, label: "Live Listings" },
  { icon: TrendingUp, val: "GHS 50",           label: "Buyer Protection" },
  { icon: Shield,     val: "100%",             label: "Verified Sellers" },
];

// ─── Component ───────────────────────────────────────────────────────────────

const Index = () => {
  const { listings, loading } = usePublicListings();
  const [reviews, setReviews] = useState<
    { buyer_name: string; stars: number; comment: string; created_at: string }[]
  >([]);
  const isMobile = useMobile();
  const { user } = useAuth();
  const navigate = useNavigate(); // ✅ replaces window.location.href

  useEffect(() => {
    supabase
      .from("reviews")
      .select("buyer_name, stars, comment, created_at")
      .gte("stars", 4)
      .not("comment", "is", null)
      .neq("comment", "")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => { if (data) setReviews(data); });
  }, []);

  const now = Date.now();
  const isActiveBoost = (l: typeof listings[0]) => {
    if (!l.boosted) return false;
    if (!l.boostExpiresAt) return true;
    return new Date(l.boostExpiresAt).getTime() > now;
  };

  const featured    = listings.filter(isActiveBoost).slice(0, 10);
  const newArrivals = listings.filter((l) => !isActiveBoost(l)).slice(0, 10);
  const trendingSneakers = listings.slice(0, 6).map((l) => ({
    id: l.id, name: l.name, brand: l.brand, price: l.price, image: l.image ?? "",
  }));

  const toCardShape = (l: typeof listings[0], isBoosted = false) => ({
    id: l.id, name: l.name, brand: l.brand, price: l.price, image: l.image ?? "",
    category: l.category, sizes: l.sizes, description: l.description, isBoosted,
    sellerVerified: l.sellerVerified, sellerIsOfficial: l.sellerIsOfficial,
  });

  const sellHref = user ? "/account?tab=settings" : "/auth";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      <Navbar />

      {/* ── Hero ── */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ paddingTop: `calc(64px + env(safe-area-inset-top, 0px))` }}
      >
        {!isMobile && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[140px]" />
          </div>
        )}

        <div className="section-padding max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center relative z-10 py-16">
          {/* Left: copy */}
          <Animate
            isMobile={isMobile}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {/* Social proof badge */}
            <Animate
              isMobile={isMobile}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border mb-6 backdrop-blur-sm"
            >
              <div className="flex -space-x-1.5">
                {["K", "A", "E"].map((l, i) => (
                  <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 border border-background flex items-center justify-center text-[8px] font-bold text-white">
                    {l}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />)}
              </div>
              <span className="text-xs text-muted-foreground font-medium">Trusted by 500+ buyers</span>
            </Animate>

            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.9] tracking-tighter">
              The Sneaker<br /><span className="text-gradient">Marketplace for Ghana</span>
            </h1>
            <p className="text-muted-foreground mt-6 text-base md:text-lg max-w-md leading-relaxed">
              Discover premium sneakers from verified Ghanaian sellers. Buyer-protected, authenticity-first.
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <Link to="/shop">
                <Button className="btn-primary h-12 px-8 rounded-full text-sm">
                  Shop Now <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="outline" className="h-12 px-8 rounded-full text-sm border-border hover:bg-muted/50">
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Live stats */}
            <Animate
              isMobile={isMobile}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex gap-6 mt-10 pt-8 border-t border-border/50"
            >
              {STAT_ITEMS(listings.length).map(({ icon: Icon, val, label }) => (
                <div key={label}>
                  <p className="font-display font-bold text-lg">{val}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Icon className="w-3 h-3" /> {label}
                  </p>
                </div>
              ))}
            </Animate>
          </Animate>

          {/* Right: trending grid */}
          <Animate
            isMobile={isMobile}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className={`w-full ${isMobile ? "mt-8" : ""}`}
          >
            {trendingSneakers.length > 0 ? (
              <div className={`grid grid-cols-2 ${isMobile ? "gap-2" : "gap-3"}`}>
                {(isMobile ? trendingSneakers.slice(0, 4) : trendingSneakers).map((sneaker, i) => (
                  <motion.div
                    key={sneaker.id}
                    {...(!isMobile ? {
                      initial: { opacity: 0, y: 20 },
                      animate: { opacity: 1, y: 0 },
                      transition: { delay: 0.4 + i * 0.1 },
                      whileHover: { y: -8, transition: { duration: 0.2 } },
                    } : {})}
                    className={`group relative aspect-square ${isMobile ? "rounded-xl" : "rounded-2xl"} bg-card border border-border overflow-hidden cursor-pointer`}
                    onClick={() => navigate(`/product/${sneaker.id}`)} // ✅ useNavigate
                  >
                    <img
                      src={sneaker.image || FALLBACK_IMG}
                      alt={sneaker.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {                          // ✅ image fallback
                        const img = e.currentTarget;
                        if (img.src !== FALLBACK_IMG) img.src = FALLBACK_IMG;
                      }}
                    />
                    {!isMobile && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <p className="text-white font-bold text-sm truncate">{sneaker.name}</p>
                          <p className="text-white/80 text-xs">GHS {sneaker.price.toLocaleString()}</p>
                        </div>
                        {i < 2 && (
                          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-primary text-[10px] font-bold text-white">
                            🔥 Trending
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className={`grid grid-cols-2 ${isMobile ? "gap-2" : "gap-3"}`}>
                {[...Array(isMobile ? 4 : 6)].map((_, i) => (
                  <div key={i} className={`aspect-square ${isMobile ? "rounded-xl" : "rounded-2xl"} bg-card border border-border animate-pulse`} />
                ))}
              </div>
            )}

            {!isMobile && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="flex justify-center mt-4">
                <Link to="/shop" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                  View all sneakers <ArrowRight className="w-3 h-3" />
                </Link>
              </motion.div>
            )}
          </Animate>
        </div>
      </section>

      {/* ── Trust Strip ── */}
      <section className="border-y border-border w-full bg-muted/20">
        <div className="section-padding max-w-7xl mx-auto py-7 grid grid-cols-1 md:grid-cols-3 gap-5">
          {TRUST_ITEMS.map((item, i) => (
            <Animate
              key={item.label}
              isMobile={isMobile}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <p className="font-display font-semibold text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </Animate>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="section-padding max-w-7xl mx-auto py-16 w-full">
        <Animate
          isMobile={isMobile}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-1">Simple Process</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">How It Works</h2>
          <p className="text-muted-foreground mt-2 text-sm max-w-md">
            Buying and selling on Kicks GH is straightforward, secure, and designed for Ghana.
          </p>
        </Animate>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line — desktop only */}
          {!isMobile && (
            <div className="absolute top-10 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-border hidden md:block pointer-events-none" />
          )}

          {HOW_IT_WORKS.map((item, i) => (
            <Animate
              key={item.step}
              isMobile={isMobile}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
            >
              {/* Step number + icon */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <span className="font-display text-3xl font-bold text-muted-foreground/20">{item.step}</span>
              </div>
              <div>
                <h3 className="font-display font-bold text-base mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>

              {/* Arrow connector — mobile only */}
              {isMobile && i < HOW_IT_WORKS.length - 1 && (
                <ArrowRight className="absolute -bottom-4 left-1/2 -translate-x-1/2 rotate-90 w-4 h-4 text-border" />
              )}
            </Animate>
          ))}
        </div>

        {/* CTA under how it works */}
        <div className="flex justify-center mt-10">
          <Link to={sellHref}>
            <Button variant="outline" className="h-11 px-7 rounded-full text-sm border-border">
              Start Selling Today <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="max-w-7xl mx-auto py-12 w-full">
        <div className="section-padding mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-1">Browse By</p>
          <h2 className="font-display text-2xl font-bold tracking-tight">Categories</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-3 px-4 sm:px-6 lg:px-8 snap-x snap-mandatory no-scrollbar">
          {CATEGORIES.map((cat, i) => (
            <Animate
              key={cat.label}
              isMobile={isMobile}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <Link
                to={`/shop?category=${cat.label}`}
                className={`snap-start flex-shrink-0 flex flex-col items-center gap-2 px-5 py-4 rounded-2xl border bg-gradient-to-b ${cat.color} hover:scale-105 transition-transform`}
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-xs font-semibold whitespace-nowrap">{cat.label}</span>
              </Link>
            </Animate>
          ))}
        </div>
      </section>

      {/* ── Featured / Boosted ── */}
      <section className="section-padding max-w-7xl mx-auto py-12 w-full">
        <Animate
          isMobile={isMobile}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-between items-end mb-8 gap-4"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary mb-1 flex items-center gap-1.5">
              <Zap className="w-3 h-3 fill-current" /> Curated
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Featured Picks</h2>
          </div>
          <Link to="/featured" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </Animate>

        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[72vw] max-w-[260px] rounded-2xl border border-border bg-card h-72 animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <Animate
            isMobile={isMobile}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center py-20 border border-dashed border-border rounded-3xl bg-muted/10"
          >
            <SneakerOutline className="w-28 h-14 text-muted-foreground/30 mx-auto mb-5" />
            <p className="font-display font-bold text-lg mb-1">No featured listings yet</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Sellers can boost their listings to appear here and reach more buyers.
            </p>
          </Animate>
        ) : (
          <>
            <div className="flex sm:hidden gap-4 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory">
              {featured.map((l, i) => (
                <div key={l.id} className="snap-start flex-shrink-0 w-[72vw] max-w-[260px]">
                  <SneakerCard sneaker={toCardShape(l, true)} index={i} />
                </div>
              ))}
            </div>
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((l, i) => (
                <SneakerCard key={l.id} sneaker={toCardShape(l, true)} index={i} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── New Arrivals ── */}
      <section className="section-padding max-w-7xl mx-auto pb-16 w-full">
        <Animate
          isMobile={isMobile}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-between items-end mb-8 gap-4"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-1">Just Dropped</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">New Arrivals</h2>
          </div>
          <Link to="/shop" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </Animate>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card h-56 sm:h-72 animate-pulse" />
            ))}
          </div>
        ) : newArrivals.length === 0 ? (
          <Animate
            isMobile={isMobile}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center py-24 border border-dashed border-border rounded-3xl bg-muted/10"
          >
            <SneakerOutline className="w-36 h-18 text-muted-foreground/25 mx-auto mb-6" />
            <p className="font-display font-bold text-xl mb-2">No listings yet</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
              Be the first to list your sneakers and reach buyers across Ghana.
            </p>
            <Link to={sellHref}>
              <Button className="btn-primary rounded-full h-11 px-7 text-sm">Start Selling</Button>
            </Link>
          </Animate>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {newArrivals.map((l, i) => (
              <SneakerCard key={l.id} sneaker={toCardShape(l)} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ── Social Proof ── */}
      {reviews.length > 0 && (
        <section className="section-padding max-w-7xl mx-auto pb-16 w-full">
          <Animate
            isMobile={isMobile}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-1">Real Reviews</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">What People Say</h2>
          </Animate>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reviews.slice(0, 3).map((r, i) => (
              <Animate
                key={i}
                isMobile={isMobile}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-muted/10 p-5 space-y-3"
              >
                <div className="flex items-center gap-0.5">
                  {[...Array(r.stars)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">"{r.comment}"</p>
                <div className="flex items-center gap-2 pt-1">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">
                    {r.buyer_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{r.buyer_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("en-GH", { month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </Animate>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA Banner ── */}
      <section className="section-padding max-w-7xl mx-auto pb-20 w-full">
        <Animate
          isMobile={isMobile}
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-14 text-center bg-zinc-950 dark:bg-zinc-900 border border-zinc-800"
        >
          {!isMobile && (
            <>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }}
              />
            </>
          )}

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-white/60 font-medium">Sellers earning daily</span>
            </div>
            <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
              Got Sneakers to Sell?
            </h2>
            <p className="text-white/50 text-base md:text-lg max-w-sm mx-auto mb-8 leading-relaxed">
              List in minutes. Reach buyers across Ghana. Get paid directly to MoMo.
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Link to={sellHref}>
                <Button className="btn-primary h-12 px-8 rounded-full text-sm">
                  Start Selling <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/shop">
                <Button variant="ghost" className="h-12 px-8 rounded-full text-sm text-white/60 hover:text-white hover:bg-white/5">
                  Browse Shop
                </Button>
              </Link>
            </div>
          </div>
        </Animate>
      </section>

      <Footer />
    </div>
  );
};

export default Index;