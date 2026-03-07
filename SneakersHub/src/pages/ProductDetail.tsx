import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingBag, Check } from "lucide-react";
import { sneakers } from "@/data/sneakers";
import { useCart } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SneakerCard from "@/components/SneakerCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ProductDetail = () => {
  const { id } = useParams();
  const sneaker = sneakers.find((s) => s.id === id);
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [added, setAdded] = useState(false);

  if (!sneaker) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Product not found.</p>
      </div>
    );
  }

  const related = sneakers.filter((s) => s.id !== sneaker.id && s.category === sneaker.category).slice(0, 3);

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }
    addItem(sneaker, selectedSize);
    setAdded(true);
    toast.success(`${sneaker.name} added to cart`);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 section-padding max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to Shop
          </Link>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-secondary rounded-2xl aspect-square flex items-center justify-center p-12 overflow-hidden"
          >
            <motion.img
              src={sneaker.image}
              alt={sneaker.name}
              className="w-full h-full object-contain"
              whileHover={{ scale: 1.05, rotate: -2 }}
              transition={{ duration: 0.4 }}
            />
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em]">{sneaker.brand}</p>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mt-2">{sneaker.name}</h1>
            <p className="font-display text-3xl font-bold mt-4">${sneaker.price}</p>
            <p className="text-muted-foreground mt-4 leading-relaxed">{sneaker.description}</p>

            {/* Sizes */}
            <div className="mt-8">
              <p className="font-display font-semibold text-sm uppercase tracking-wider mb-3">Select Size</p>
              <div className="flex flex-wrap gap-2">
                {sneaker.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-12 h-12 rounded-lg font-display font-medium text-sm transition-all duration-200 ${
                      selectedSize === size
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:border-primary border border-border"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Add to cart */}
            <Button
              onClick={handleAddToCart}
              className="btn-primary w-full h-14 rounded-full text-sm mt-8"
              disabled={added}
            >
              {added ? (
                <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Added!</span>
              ) : (
                <span className="flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Add to Cart</span>
              )}
            </Button>
          </motion.div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-20 pb-20">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-2xl font-bold tracking-tight mb-8"
            >
              You Might Also Like
            </motion.h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((s, i) => (
                <SneakerCard key={s.id} sneaker={s} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default ProductDetail;