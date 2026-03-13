import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Truck, Shield, RotateCcw, Zap, Star, Users, TrendingUp } from "lucide-react";
import SneakerCard from "@/components/SneakerCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/sneaker-hero.png";
import { Button } from "@/components/ui/button";
import { usePublicListings } from "@/context/PublicListingsContext";

// Sneaker outline SVG for empty states
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

const CATEGORIES = [
  { label: "Running", emoji: "🏃", color: "from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-600" },
  { label: "Lifestyle", emoji: "✨", color: "from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-600" },
  { label: "Basketball", emoji: "🏀", color: "from-orange-500/10 to-orange-500/5 border-orange-500/20 text-orange-600" },
  { label: "Outdoor", emoji: "🏔️", color: "from-green-500/10 to-green-500/5 border-green-500/20 text-green-600" },
  { label: "Training", emoji: "💪", color: "from-red-500/10 to-red-500/5 border-red-500/20 text-red-600" },
  { label: "Other", emoji: "👟", color: "from-zinc-500/10 to-zinc-500/5 border-zinc-500/20 text-zinc-600" },
];

const SOCIAL_PROOF = [
  { name: "Kwame A.", location: "Accra", rating: 5, text: "Got my Jordan 1s in 2 days. Seller was legit, exactly as described." },
  { name: "Abena M.", location: "Kumasi", rating: 5, text: "Finally a platform I can trust. Buyer protection made me feel safe." },
  { name: "Kofi B.", location: "Tamale", rating: 5, text: "Sold out in 3 hours. Best place to move heat in Ghana 🔥" },
];

const Index = () => {
  const { listings, loading } = usePublicListings();

  const now = Date.now();
  const isActiveBoost = (l: typeof listings[0]) => {
    if (!l.boosted) return false;
    if (!l.boostExpiresAt) return true;
    return new Date(l.boostExpiresAt).getTime() > now;
  };

  const featured = listings.filter(isActiveBoost).slice(0, 10);
  const newArrivals = listings.filter((l) => !isActiveBoost(l)).slice(0, 10);

  const toCardShape = (l: typeof listings[0], isBoosted = false) => ({
    id: l.id, name: l.name, brand: l.brand, price: l.price, image: l.image ?? "",
    category: l.category, sizes: l.sizes, description: l.description, isBoosted,
    sellerVerified: l.sellerVerified, sellerIsOfficial: l.sellerIsOfficial,
  });

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden" style={{ paddingTop: `calc(64px + env(safe-area-inset-top, 0px))` }}>
        {/* Subtle ambient glow — contained, not orange everywhere */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[140px]" />
        </div>

        <div className="section-padding max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center relative z-10 py-16">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
            {/* Social proof badge */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border mb-6 backdrop-blur-sm">
              <div className="flex -space-x-1.5">
                {["K","A","E"].map((l, i) => (
                  <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 border border-background flex items-center justify-center text-[8px] font-bold text-white">{l}</div>
                ))}
              </div>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />)}
              </div>
              <span className="text-xs text-muted-foreground font-medium">Trusted by 500+ buyers</span>
            </motion.div>

            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.9] tracking-tighter">
              Step Into<br /><span className="text-gradient">The Future</span>
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

            {/* Live stats row */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="flex gap-6 mt-10 pt-8 border-t border-border/50">
              {[
                { icon: Users, val: `${listings.length}+`, label: "Live Listings" },
                { icon: TrendingUp, val: "GHS 50", label: "Buyer Protection" },
                { icon: Shield, val: "100%", label: "Verified Sellers" },
              ].map(({ icon: Icon, val, label }) => (
                <div key={label}>
                  <p className="font-display font-bold text-lg">{val}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Icon className="w-3 h-3" /> {label}
                  </p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.25 }}
            className="relative flex items-center justify-center w-full">
            <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl" />
            <motion.img src={heroImage} alt="Featured sneaker"
              className="relative z-10 w-full max-w-xs sm:max-w-sm md:max-w-lg drop-shadow-2xl"
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
          </motion.div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="border-y border-border w-full bg-muted/20">
        <div className="section-padding max-w-7xl mx-auto py-7 grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Truck, label: "Fast Delivery", desc: "Across all regions in Ghana" },
            { icon: Shield, label: "Verified Sellers", desc: "Every seller reviewed & approved" },
            { icon: RotateCcw, label: "Buyer Protection", desc: "Two-sided order confirmation" },
          ].map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.1 }} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <p className="font-display font-semibold text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Category Scroll ── */}
      <section className="max-w-7xl mx-auto py-12 w-full">
        <div className="section-padding mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-1">Browse By</p>
          <h2 className="font-display text-2xl font-bold tracking-tight">Categories</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-3 px-4 sm:px-6 lg:px-8 snap-x snap-mandatory no-scrollbar">
          {CATEGORIES.map((cat, i) => (
            <motion.div key={cat.label} initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}>
              <Link to={`/shop?category=${cat.label}`}
                className={`snap-start flex-shrink-0 flex flex-col items-center gap-2 px-5 py-4 rounded-2xl border bg-gradient-to-b ${cat.color} hover:scale-105 transition-transform`}>
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-xs font-semibold whitespace-nowrap">{cat.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Featured / Boosted ── */}
      <section className="section-padding max-w-7xl mx-auto py-12 w-full">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="flex justify-between items-end mb-8 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary mb-1 flex items-center gap-1.5">
              <Zap className="w-3 h-3 fill-current" /> Curated
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Featured Picks</h2>
          </div>
          <Link to="/featured" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[72vw] max-w-[260px] rounded-2xl border border-border bg-card h-72 animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center py-20 border border-dashed border-border rounded-3xl bg-muted/10">
            <SneakerOutline className="w-28 h-14 text-muted-foreground/30 mx-auto mb-5" />
            <p className="font-display font-bold text-lg mb-1">No featured listings yet</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Sellers can boost their listings to appear here and reach more buyers.
            </p>
          </motion.div>
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
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="flex justify-between items-end mb-8 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-1">Just Dropped</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">New Arrivals</h2>
          </div>
          <Link to="/shop" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card h-56 sm:h-72 animate-pulse" />
            ))}
          </div>
        ) : newArrivals.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center py-24 border border-dashed border-border rounded-3xl bg-muted/10">
            <SneakerOutline className="w-36 h-18 text-muted-foreground/25 mx-auto mb-6" />
            <p className="font-display font-bold text-xl mb-2">No listings yet</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
              Be the first to list your sneakers and reach buyers across Ghana.
            </p>
            <Link to="/auth">
              <Button className="btn-primary rounded-full h-11 px-7 text-sm">Start Selling</Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {newArrivals.map((l, i) => (
              <SneakerCard key={l.id} sneaker={toCardShape(l)} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ── Social Proof ── */}
      <section className="section-padding max-w-7xl mx-auto pb-16 w-full">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-1">Real Reviews</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">What People Say</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SOCIAL_PROOF.map((r, i) => (
            <motion.div key={r.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-muted/10 p-5 space-y-3">
              <div className="flex items-center gap-0.5">
                {[...Array(r.rating)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-sm leading-relaxed text-foreground/80">"{r.text}"</p>
              <div className="flex items-center gap-2 pt-1">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">
                  {r.name[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground">{r.location}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner — dark premium card ── */}
      <section className="section-padding max-w-7xl mx-auto pb-20 w-full">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-14 text-center bg-zinc-950 dark:bg-zinc-900 border border-zinc-800">
          {/* Subtle glow accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
          {/* Grid texture */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

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
              <Link to="/auth">
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
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;