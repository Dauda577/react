"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "@/lib/router";
import {
  ArrowRight, MapPin, Phone, Tag, Sparkles, Zap,
  MessageCircle, BadgePercent, ShieldCheck, TrendingUp, Users, Package,
} from "lucide-react";
import SneakerCard from "@/components/ListingCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { usePublicListings } from "@/context/PublicListingsContext";
import { useAuth } from "@/context/AuthContext";
import { MAIN_CATEGORIES } from "@/data/taxonomy";

// ─── Constants ───────────────────────────────────────────────────────────────

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

const STATS = [
  { icon: Package, value: "500+", label: "Items Listed" },
  { icon: Users, value: "200+", label: "Active Sellers" },
  { icon: Zap, value: "0%", label: "Platform Fees" },
  { icon: TrendingUp, value: "24h", label: "Avg. Sell Time" },
];

// ─── Animated Counter ────────────────────────────────────────────────────────

const AnimatedStat = ({ icon: Icon, value, label }: { icon: any; value: string; label: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center gap-2"
  >
    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <span className="font-display text-2xl sm:text-3xl font-bold text-foreground">{value}</span>
    <span className="text-xs text-muted-foreground font-medium">{label}</span>
  </motion.div>
);

// ─── Component ───────────────────────────────────────────────────────────────

const Index = () => {
  const { listings, loading } = usePublicListings();
  const [visible, setVisible] = useState(24);
  const gridRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    setVisible(24);
  }, []);

  const now = Date.now();
  const isActiveBoost = (l: typeof listings[0]) => {
    if (!l.boosted) return false;
    if (!l.boostExpiresAt) return true;
    return new Date(l.boostExpiresAt).getTime() > now;
  };

  const filtered = [...listings].sort((a, b) => {
    const aBoost = isActiveBoost(a) ? 1 : 0;
    const bBoost = isActiveBoost(b) ? 1 : 0;
    if (aBoost !== bBoost) return bBoost - aBoost;
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

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

  const handleReset = () => {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const postHref = user ? "/sell" : "/auth";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      <Navbar />

      {/* ══════ HERO ══════ */}
      <section
        className="relative min-h-[85vh] flex items-center justify-center overflow-hidden"
        style={{ paddingTop: `calc(64px + env(safe-area-inset-top, 0px))` }}
      >
        {/* Gradient mesh background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-purple-500/10" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px]" />
        </div>

        {/* Dot grid overlay */}
        <div className="absolute inset-0 dot-grid opacity-40" />

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/40"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                animation: `float ${4 + i * 0.8}s ease-in-out infinite`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>

        {/* Hero content */}
        <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">Ghana's #1 Marketplace</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="font-display text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.9] mb-6"
          >
            Buy & Sell
            <br />
            <span className="text-gradient">Anything.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-muted-foreground text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Zero fees. Direct deals. Verified sellers.
            <br className="hidden sm:block" />
            The future of commerce in Ghana.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/shop">
              <Button className="btn-primary rounded-full h-12 px-8 text-sm font-semibold spring-press glow-pulse">
                Browse Marketplace <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link to={postHref}>
              <Button variant="outline" className="btn-outline-hero rounded-full h-12 px-8 text-sm font-semibold spring-press">
                Start Selling <Zap className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ══════ STATS ══════ */}
      <section className="px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-3xl mx-auto py-10 px-8 rounded-3xl bg-card/80 backdrop-blur-xl border border-border/60"
        >
          {STATS.map((stat) => (
            <AnimatedStat key={stat.label} {...stat} />
          ))}
        </motion.div>
      </section>

      {/* ══════ CATEGORIES ══════ */}
      <section className="px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary mb-1">Explore</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">Categories</h2>
          </div>
          <Link to="/shop" className="text-xs text-primary font-semibold hover:opacity-70 transition-opacity flex items-center gap-1 group">
            View all <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar">
          {MAIN_CATEGORIES.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link to={`/shop?main=${c.id}`}>
                <span className="flex flex-col items-center gap-2.5 group min-w-[80px]">
                  <span className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20 border-border/60 group-hover:border-primary/50">
                    <img src={c.img} alt={c.label} loading="lazy" className="w-full h-full object-cover" />
                  </span>
                  <span className="text-[11px] sm:text-xs font-medium transition-colors text-muted-foreground group-hover:text-foreground whitespace-nowrap">
                    {c.label}
                  </span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════ TRUST ══════ */}
      <section className="px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TRUST_ITEMS.map(({ icon: Icon, title, sub }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="flex items-start gap-3 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/60 p-4"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground mb-0.5">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════ PRODUCT GRID ══════ */}
      <section ref={gridRef} className="px-4 sm:px-6 lg:px-8 py-10 scroll-mt-24">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary mb-1">Latest</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              {loading ? "Loading..." : `${filtered.length} Items`}
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="rounded-2xl shimmer h-44 sm:h-56" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-3xl">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-xl font-display font-bold mb-2">No products found</p>
            <p className="text-sm text-muted-foreground mb-5">Try a different search or category.</p>
            <Button variant="outline" className="rounded-full h-10 px-6 text-sm spring-press" onClick={handleReset}>
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
            <Button variant="outline" className="rounded-full h-10 px-8 text-sm spring-press" onClick={() => setVisible((v) => v + 24)}>
              Load more
            </Button>
          </div>
        )}
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="gradient-separator mb-12 sm:mb-16" />
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary mb-2">How It Works</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold">Three Simple Steps</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 max-w-4xl mx-auto">
          {HOW_IT_WORKS.map(({ icon: Icon, label, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="flex flex-col items-center text-center gap-4"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center gradient-border">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <div>
                <p className="text-base font-bold text-foreground mb-1">{label}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex justify-center mt-10">
          <Link to={postHref}>
            <Button className="btn-primary rounded-full h-12 px-10 text-sm font-semibold spring-press">
              Get Started <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
