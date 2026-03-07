import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingBag, Check, MapPin, Phone, CheckCircle, Store } from "lucide-react";
import { sneakers } from "@/data/sneakers";
import { useCart } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SneakerCard from "@/components/SneakerCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Mock seller data — replace with real data from your backend later
const mockSeller = {
  name: "Kwame Asante",
  initials: "KA",
  phone: "+233 24 000 0000",
  location: "Accra, Ghana",
  verified: true,
  shopName: "Kwame's Sneaker Vault",
  totalListings: 12,
  rating: 4.9,
  memberSince: "2023",
};

const ProductDetail = () => {
  const { id } = useParams();
  const sneaker = sneakers.find((s) => s.id === id);
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [added, setAdded] = useState(false);

  // In a real app this would come from auth context — e.g. const { role } = useAuth()
  const role = "buyer";

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

            {/* ── Seller Info (buyer only) ── */}
            {role === "buyer" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6 rounded-2xl border border-border p-5"
              >
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
                  Sold by
                </p>

                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-display text-sm font-bold text-primary">{mockSeller.initials}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-display font-semibold text-sm">{mockSeller.name}</p>
                      {mockSeller.verified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Store className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{mockSeller.shopName}</p>
                    </div>
                  </div>
                </div>

                {/* Contact details */}
                <div className="mt-4 space-y-2 border-t border-border pt-4">
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <a
                      href={`tel:${mockSeller.phone}`}
                      className="text-sm text-foreground hover:text-primary transition-colors"
                    >
                      {mockSeller.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{mockSeller.location}</p>
                  </div>
                </div>

                {/* Seller stats */}
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
                  {[
                    { label: "Listings", value: mockSeller.totalListings },
                    { label: "Rating", value: `${mockSeller.rating} ★` },
                    { label: "Since", value: mockSeller.memberSince },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="font-display font-bold text-sm">{stat.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
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