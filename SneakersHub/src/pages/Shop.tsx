import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sneakers, categories } from "@/data/sneakers";
import SneakerCard from "@/components/SneakerCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Shop = () => {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All" ? sneakers : sneakers.filter((s) => s.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 section-padding max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Shop All</h1>
          <p className="text-muted-foreground mt-2">Browse our entire collection</p>
        </motion.div>

        {/* Category filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 mt-8 flex-wrap"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-display font-medium transition-all duration-300 ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10 pb-20">
          <AnimatePresence mode="popLayout">
            {filtered.map((s, i) => (
              <SneakerCard key={s.id} sneaker={s} index={i} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Shop;