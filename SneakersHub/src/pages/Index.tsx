import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Truck, Shield, RotateCcw } from "lucide-react";
import { sneakers } from "@/data/sneakers";
import SneakerCard from "@/components/SneakerCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/sneaker-hero.png";
import { Button } from "@/components/ui/button";

const Index = () => {
  const featured = sneakers.filter((s) => s.isFeatured);
  const newArrivals = sneakers.filter((s) => s.isNew);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-[100px]" />
        </div>

        <div className="section-padding max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-primary font-display text-sm font-semibold uppercase tracking-[0.3em] mb-4"
            >
              New Collection 2026
            </motion.p>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.9] tracking-tighter">
              Step Into
              <br />
              <span className="text-gradient">The Future</span>
            </h1>
            <p className="text-muted-foreground mt-6 text-lg max-w-md leading-relaxed">
              Discover our curated selection of premium sneakers. Engineered for performance, designed for style.
            </p>
            <div className="flex gap-4 mt-8">
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

          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            className="relative flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl" />
            <motion.img
              src={heroImage}
              alt="Featured sneaker"
              className="relative z-10 w-full max-w-lg drop-shadow-2xl"
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
      </section>

      {/* Features strip */}
      <section className="border-y border-border">
        <div className="section-padding max-w-7xl mx-auto py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Truck, label: "Free Shipping", desc: "On orders over $150" },
            { icon: Shield, label: "Authentic Guarantee", desc: "100% verified products" },
            { icon: RotateCcw, label: "Easy Returns", desc: "30-day return policy" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
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

      {/* Featured */}
      <section className="section-padding max-w-7xl mx-auto py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-between items-end mb-10"
        >
          <div>
            <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em] mb-2">Curated</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Featured Picks</h2>
          </div>
          <Link to="/shop" className="nav-link text-sm font-medium">
            View All <ArrowRight className="inline w-4 h-4 ml-1" />
          </Link>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((s, i) => (
            <SneakerCard key={s.id} sneaker={s} index={i} />
          ))}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="section-padding max-w-7xl mx-auto pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-between items-end mb-10"
        >
          <div>
            <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em] mb-2">Just Dropped</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">New Arrivals</h2>
          </div>
          <Link to="/shop" className="nav-link text-sm font-medium">
            View All <ArrowRight className="inline w-4 h-4 ml-1" />
          </Link>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {newArrivals.map((s, i) => (
            <SneakerCard key={s.id} sneaker={s} index={i} />
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="section-padding max-w-7xl mx-auto pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-2xl p-12 md:p-16 text-center"
          style={{ background: "var(--gradient-hero)" }}
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground tracking-tight">
            Get 15% Off Your First Order
          </h2>
          <p className="text-primary-foreground/80 mt-4 text-lg max-w-md mx-auto">
            Sign up for our newsletter and unlock exclusive deals.
          </p>
          <div className="mt-8 flex gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 h-12 px-5 rounded-full bg-primary-foreground/20 border border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50 text-sm focus:outline-none focus:border-primary-foreground"
            />
            <Button className="h-12 px-6 rounded-full bg-primary-foreground text-primary font-display font-semibold text-sm hover:bg-primary-foreground/90">
              Subscribe
            </Button>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;