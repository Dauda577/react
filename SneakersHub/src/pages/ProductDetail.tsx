import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShoppingBag, Check, MapPin, Phone, CheckCircle, Store, X, UserPlus, LogIn, Star, ShieldCheck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { usePublicListings, PublicListing } from "@/context/PublicListingsContext";
import { useRatings } from "@/context/RatingContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SneakerCard from "@/components/SneakerCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const GuestPromptModal = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  return (
    <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
      <motion.div key="modal" initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="font-display font-bold text-base">Sign in to continue</p>
          <button onClick={onClose} className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-5">You need an account to add items to your cart and place orders.</p>
        <div className="flex flex-col gap-2">
          <Button className="btn-primary rounded-full h-10 text-sm" onClick={() => navigate("/auth")}>
            <LogIn className="w-4 h-4 mr-2" /> Sign In
          </Button>
          <Button variant="outline" className="rounded-full h-10 text-sm" onClick={() => navigate("/auth")}>
            <UserPlus className="w-4 h-4 mr-2" /> Create Account
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { listings, loading, incrementViews } = usePublicListings();
  const { getSellerStats, fetchReviews, reviews } = useRatings();
  const { addItem } = useCart();
  const { user, isGuest, loading: authLoading } = useAuth();

  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  const listing = listings.find((l) => l.id === id);
  const related = listings.filter((l) => l.id !== id && l.category === listing?.category).slice(0, 3);

  useEffect(() => {
    if (id) incrementViews(id);
  }, [id]);

  useEffect(() => {
    if (listing?.sellerId) fetchReviews(listing.sellerId);
  }, [listing?.sellerId]);

  const { average, count } = listing ? getSellerStats(listing.sellerId) : { average: 0, count: 0 };

  const handleAddToCart = () => {
    if (authLoading) return;
    if (!user || isGuest) { setShowGuestModal(true); return; }
    if (user.role === "seller") { toast.error("Sellers cannot buy"); return; }
    if (!selectedSize) { toast.error("Please select a size"); return; }
    if (!listing) return;

    addItem({
      id: listing.id,
      name: listing.name,
      brand: listing.brand,
      price: listing.price,
      image: listing.image ?? "",
      sellerId: listing.sellerId,
    }, selectedSize);
    setAdded(true);
    toast.success("Added to cart!");
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="section-padding max-w-6xl mx-auto pt-28 pb-20">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="rounded-2xl bg-card border border-border h-96 animate-pulse" />
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-6 bg-card border border-border rounded-xl animate-pulse" style={{ width: `${80 - i * 10}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navbar />
        <div className="text-center pt-20">
          <p className="font-display text-2xl font-bold mb-2">Listing not found</p>
          <p className="text-muted-foreground mb-6">This listing may have been removed or sold.</p>
          <Button className="btn-primary rounded-full" onClick={() => navigate("/shop")}>Back to Shop</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AnimatePresence>{showGuestModal && <GuestPromptModal onClose={() => setShowGuestModal(false)} />}</AnimatePresence>

      <div className="section-padding max-w-6xl mx-auto pt-28 pb-20">
        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group text-sm">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
        </button>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Image */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
            className="relative rounded-2xl overflow-hidden bg-card border border-border aspect-square flex items-center justify-center">
            {listing.image ? (
              <img src={listing.image} alt={listing.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-8xl">👟</span>
            )}
            {listing.boosted && (
              <div className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "white" }}>
                ⚡ Featured
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.2em] mb-1">{listing.brand}</p>
              <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{listing.name}</h1>
              <p className="text-xs text-muted-foreground mt-1">{listing.category}</p>
            </div>

            <p className="font-display text-3xl font-bold text-primary">GHS {listing.price.toLocaleString()}</p>

            <p className="text-muted-foreground text-sm leading-relaxed">{listing.description}</p>

            {/* Sizes */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Size (EU) {selectedSize && <span className="text-primary ml-2">— Selected: {selectedSize}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {listing.sizes.map((size) => (
                  <button key={size} onClick={() => setSelectedSize(size)}
                    className={`w-11 h-11 rounded-xl border text-sm font-semibold transition-all
                      ${selectedSize === size
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50 text-foreground"
                      }`}>
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Escrow notice for verified sellers */}
            {listing.sellerVerified && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 rounded-xl border border-green-500/30 bg-green-500/5"
              >
                <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400">Escrow Protected Payment</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your payment is held securely and only released to the seller after you confirm receipt.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Add to cart — hidden for sellers */}
            {user?.role !== "seller" && (
              <Button onClick={handleAddToCart}
                disabled={authLoading}
                className={`w-full h-12 rounded-full font-display text-sm transition-all ${added ? "bg-green-500 hover:bg-green-500" : "btn-primary"}`}>
                {authLoading
                  ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Loading...</span>
                  : added
                    ? <><Check className="w-4 h-4 mr-2" /> Added!</>
                    : <><ShoppingBag className="w-4 h-4 mr-2" /> Add to Cart</>
                }
              </Button>
            )}

            {/* Seller card */}
            <div className="rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sold by</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground">Active</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="font-display text-sm font-bold text-primary">
                    {listing.sellerName[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{listing.sellerName}</p>
                    {listing.sellerVerified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                    {listing.boosted && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        ⚡ Featured
                      </span>
                    )}
                  </div>
                  {count > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      {[1,2,3,4,5].map((n) => (
                        <Star key={n} className={`w-3 h-3 ${n <= Math.round(average) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                      <span className="text-xs text-muted-foreground ml-0.5">{average} ({count} {count === 1 ? "review" : "reviews"})</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                {(listing.sellerCity || listing.sellerRegion) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    {[listing.sellerCity, listing.sellerRegion, "Ghana"].filter(Boolean).join(", ")}
                  </p>
                )}
                {listing.sellerPhone && (
                  <a href={`tel:${listing.sellerPhone}`}
                    className="text-xs text-muted-foreground flex items-center gap-2 hover:text-primary transition-colors">
                    <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" /> {listing.sellerPhone}
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
                <div className="text-center px-2 py-2 rounded-xl bg-muted/30">
                  <p className="font-display font-bold text-sm">{count > 0 ? average : "—"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Rating</p>
                </div>
                <div className="text-center px-2 py-2 rounded-xl bg-muted/30">
                  <p className="font-display font-bold text-sm">{listing.sellerMemberSince}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Member since</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Related listings */}
        {related.length > 0 && (
          <div className="mt-20">
            <h2 className="font-display text-2xl font-bold tracking-tight mb-8">More in {listing.category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((l, i) => (
                <SneakerCard key={l.id} sneaker={{
                  id: l.id, name: l.name, brand: l.brand, price: l.price,
                  image: l.image ?? "", category: l.category, sizes: l.sizes,
                  description: l.description, isBoosted: l.boosted,
                  sellerVerified: l.sellerVerified,
                }} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default ProductDetail;