import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Truck, Shield, RotateCcw, Zap, Package } from "lucide-react";
import SneakerCard from "@/components/SneakerCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/sneaker-hero.png";
import { Button } from "@/components/ui/button";
import { usePublicListings } from "@/context/PublicListingsContext";

const Index = () => {
  const { listings, loading } = usePublicListings();

  const featured = listings.filter((l) => l.boosted).slice(0, 6);
  const newArrivals = listings.slice(0, 6); // latest 6 by created_at desc

  const toCardShape = (l: typeof listings[0], isBoosted = false) => ({
    id: l.id,
    name: l.name,
    brand: l.brand,
    price: l.price,
    image: l.image ?? "",
    category: l.category,
    sizes: l.sizes,
    description: l.description,
    isBoosted,
  });

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        <div className="absolute inset-0 opacity-20 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 md:w-72 md:h-72 bg-primary/10 rounded-full blur-[100px]" />
        </div>
        <div className="section-padding max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }} className="w-full min-w-0">
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-primary font-display text-sm font-semibold uppercase tracking-[0.3em] mb-4">
              New Collection 2026
            </motion.p>
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.9] tracking-tighter break-words">
              Step Into<br /><span className="text-gradient">The Future</span>
            </h1>
            <p className="text-muted-foreground mt-6 text-base md:text-lg max-w-md leading-relaxed">
              Discover premium sneakers from verified sellers. Engineered for performance, designed for style.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link to="/shop">
                <Button className="btn-primary h-12 px-8 rounded-full text-sm">
                  Shop Now <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="outline" className="btn-outline-hero h-12 px-8 rounded-full text-sm">
                  Learn More
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            className="relative flex items-center justify-center w-full min-w-0">
            <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl" />
            <motion.img src={heroImage} alt="Featured sneaker"
              className="relative z-10 w-full max-w-xs sm:max-w-sm md:max-w-lg drop-shadow-2xl"
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
          </motion.div>
        </div>
      </section>

      {/* Features strip */}
      <section className="border-y border-border w-full">
        <div className="section-padding max-w-7xl mx-auto py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Truck, label: "Fast Delivery", desc: "Across all regions in Ghana" },
            { icon: Shield, label: "Verified Sellers", desc: "Every seller is reviewed by buyers" },
            { icon: RotateCcw, label: "Buyer Protection", desc: "Two-sided order confirmation" },
          ].map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.15 }} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-display font-semibold text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured / Boosted */}
      <section className="section-padding max-w-7xl mx-auto py-20 w-full">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="flex justify-between items-end mb-10 gap-4">
          <div className="min-w-0">
            <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em] mb-2">Curated</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Featured Picks</h2>
            {featured.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                {featured.length} boosted {featured.length === 1 ? "listing" : "listings"} from sellers
              </p>
            )}
          </div>
          <Link to="/shop" className="nav-link text-sm font-medium flex-shrink-0">
            View All <ArrowRight className="inline w-4 h-4 ml-1" />
          </Link>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card h-72 animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <p className="font-display font-semibold mb-1">No featured listings yet</p>
            <p className="text-sm text-muted-foreground">Sellers can boost their listings to appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((l, i) => (
              <SneakerCard key={l.id} sneaker={toCardShape(l, true)} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* New Arrivals */}
      <section className="section-padding max-w-7xl mx-auto pb-20 w-full">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="flex justify-between items-end mb-10 gap-4">
          <div className="min-w-0">
            <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em] mb-2">Just Dropped</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">New Arrivals</h2>
          </div>
          <Link to="/shop" className="nav-link text-sm font-medium flex-shrink-0">
            View All <ArrowRight className="inline w-4 h-4 ml-1" />
          </Link>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card h-72 animate-pulse" />
            ))}
          </div>
        ) : newArrivals.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <p className="text-sm text-muted-foreground">No listings yet. Be the first to sell!</p>
            <Link to="/auth">
              <Button className="btn-primary rounded-full mt-4 h-10 px-6 text-sm">Start Selling</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {newArrivals.map((l, i) => (
              <SneakerCard key={l.id} sneaker={toCardShape(l)} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* CTA Banner */}
      <section className="section-padding max-w-7xl mx-auto pb-20 w-full">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-2xl p-8 md:p-12 lg:p-16 text-center"
          style={{ background: "var(--gradient-hero)" }}>
          <h2 className="font-display text-2xl sm:text-3xl md:text-5xl font-bold text-primary-foreground tracking-tight">
            Got Sneakers to Sell?
          </h2>
          <p className="text-primary-foreground/80 mt-4 text-base md:text-lg max-w-md mx-auto">
            List your sneakers in minutes and reach buyers across Ghana.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/auth">
              <Button className="h-12 px-8 rounded-full bg-primary-foreground text-primary font-display font-semibold text-sm hover:bg-primary-foreground/90">
                Start Selling <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;