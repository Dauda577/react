import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { Link } from "react-router-dom";
import SneakerCard from "@/components/SneakerCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/sneaker-hero.png";
import { Button } from "@/components/ui/button";
import { usePublicListings } from "@/context/PublicListingsContext";
import type { Listing, Sneaker } from "@/types"; // Adjust path as needed

// Lazy load non-critical components
const Reviews = lazy(() => import("@/components/Reviews"));
const CategoryScroll = lazy(() => import("@/components/CategoryScroll"));

// ========== Types ==========
interface Review {
  buyer_name: string;
  stars: number;
  comment: string | null;
  created_at: string;
}

interface Category {
  label: string;
  emoji: string;
  color: string;
}

// ========== Constants ==========
const CATEGORIES: Category[] = [
  { label: "Running", emoji: "🏃", color: "from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-600" },
  { label: "Lifestyle", emoji: "✨", color: "from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-600" },
  { label: "Basketball", emoji: "🏀", color: "from-orange-500/10 to-orange-500/5 border-orange-500/20 text-orange-600" },
  { label: "Outdoor", emoji: "🏔️", color: "from-green-500/10 to-green-500/5 border-green-500/20 text-green-600" },
  { label: "Training", emoji: "💪", color: "from-red-500/10 to-red-500/5 border-red-500/20 text-red-600" },
  { label: "Other", emoji: "👟", color: "from-zinc-500/10 to-zinc-500/5 border-zinc-500/20 text-zinc-600" },
];

// ========== Custom Hooks ==========
const useMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

const useReducedMotion = (): boolean => {
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener('change', handleChange);
    
    return () => query.removeEventListener('change', handleChange);
  }, []);
  
  return reducedMotion;
};

// ========== Icon Components (replacing lucide-react) ==========
const ArrowIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const StarIcon: React.FC<{ className?: string; filled?: boolean }> = ({ 
  className = "w-4 h-4", 
  filled = true 
}) => (
  <svg className={`${className} ${filled ? 'fill-current' : ''}`} viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" 
      stroke="currentColor" fill={filled ? 'currentColor' : 'none'} />
  </svg>
);

const TruckIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

const ShieldIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const RotateIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ZapIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const UsersIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const TrendingIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

// Sneaker outline component
const SneakerOutline: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 44 C8 44 12 28 28 24 C38 21 46 26 56 24 C66 22 72 16 80 14 C90 12 98 16 104 22 C110 28 112 36 110 42 C108 46 104 48 100 48 L16 48 C12 48 8 46 8 44Z" 
      stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M28 24 C28 24 32 32 40 34 C48 36 56 32 56 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M56 24 C56 24 60 30 68 30 C74 30 78 26 80 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M8 40 L110 40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <ellipse cx="22" cy="48" rx="8" ry="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <ellipse cx="98" cy="48" rx="8" ry="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  </svg>
);

// ========== Main Component ==========
const Index: React.FC = () => {
  const { listings, loading } = usePublicListings();
  const isMobile = useMobile();
  const reducedMotion = useReducedMotion();

  // Memoized boost checker
  const isActiveBoost = useMemo(
    () => (listing: Listing): boolean => {
      const now = Date.now();
      if (!listing.boosted) return false;
      if (!listing.boostExpiresAt) return true;
      return new Date(listing.boostExpiresAt).getTime() > now;
    },
    []
  );

  // Memoized filtered listings
  const { featured, newArrivals } = useMemo(() => {
    const activeBoosted = listings.filter(isActiveBoost);
    const nonBoosted = listings.filter(l => !isActiveBoost(l));
    
    return {
      featured: activeBoosted.slice(0, 10),
      newArrivals: nonBoosted.slice(0, 10)
    };
  }, [listings, isActiveBoost]);

  // Transform listing to sneaker shape
  const toSneakerShape = (listing: Listing, isBoosted = false): Sneaker => ({
    id: listing.id,
    name: listing.name,
    brand: listing.brand,
    price: listing.price,
    image: listing.image ?? "",
    category: listing.category,
    sizes: listing.sizes,
    description: listing.description,
    isBoosted,
    sellerVerified: listing.sellerVerified,
    sellerIsOfficial: listing.sellerIsOfficial,
  });

  // Don't animate if mobile or user prefers reduced motion
  const shouldAnimate = !isMobile && !reducedMotion;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background glow - removed on mobile */}
        {!isMobile && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[140px]" />
          </div>
        )}

        <div className="section-padding max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-8 items-center py-12">
          {/* Content */}
          <div>
            {/* Social proof badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border mb-6">
              <div className="flex -space-x-1.5">
                {["K", "A", "E"].map((letter, i) => (
                  <div 
                    key={i} 
                    className="w-5 h-5 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 border border-background flex items-center justify-center text-[8px] font-bold text-white"
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground font-medium">Trusted by 500+ buyers</span>
            </div>

            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.9] tracking-tighter">
              Step Into<br /><span className="text-gradient">The Future</span>
            </h1>
            
            <p className="text-muted-foreground mt-4 text-base max-w-md">
              Discover premium sneakers from verified Ghanaian sellers. Buyer-protected, authenticity-first.
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <Link to="/shop">
                <Button className="h-11 px-6 rounded-full text-sm">
                  Shop Now <ArrowIcon className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              {!isMobile && (
                <Link to="/about">
                  <Button variant="outline" className="h-11 px-6 rounded-full text-sm">
                    Learn More
                  </Button>
                </Link>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-8 pt-4 border-t border-border/50">
              <div>
                <p className="font-display font-bold text-lg">{listings.length}+</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <UsersIcon className="w-3 h-3" /> Live Listings
                </p>
              </div>
              <div>
                <p className="font-display font-bold text-lg">GHS 50</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <ShieldIcon className="w-3 h-3" /> Protection
                </p>
              </div>
              <div>
                <p className="font-display font-bold text-lg">100%</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <TrendingIcon className="w-3 h-3" /> Verified
                </p>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="flex items-center justify-center">
            <img 
              src={heroImage} 
              alt="Featured sneaker"
              className="w-full max-w-xs md:max-w-lg drop-shadow-2xl"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {/* Trust Strip - Simplified for mobile */}
      <section className="border-y border-border bg-muted/20">
        <div className="section-padding max-w-7xl mx-auto py-4 grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center mx-auto mb-1">
              <TruckIcon className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium">Fast Delivery</p>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center mx-auto mb-1">
              <ShieldIcon className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium">Verified Sellers</p>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center mx-auto mb-1">
              <RotateIcon className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium">Buyer Protection</p>
          </div>
        </div>
      </section>

      {/* Categories - Lazy Loaded */}
      <Suspense fallback={<div className="h-24 animate-pulse bg-muted/20 mx-4 rounded-xl" />}>
        <CategoryScroll categories={CATEGORIES} />
      </Suspense>

      {/* Featured Section */}
      <section className="section-padding max-w-7xl mx-auto py-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary mb-1 flex items-center gap-1.5">
              <ZapIcon className="w-3 h-3 fill-current" /> Curated
            </p>
            <h2 className="font-display text-2xl font-bold">Featured Picks</h2>
          </div>
          <Link to="/featured" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            View {!isMobile && 'All'} <ArrowIcon className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(isMobile ? 4 : 6)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card h-48 animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-muted/10">
            <SneakerOutline className="w-28 h-14 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-display font-bold text-base mb-1">No featured listings yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Sellers can boost their listings to appear here
            </p>
          </div>
        ) : (
          <div className={`grid ${isMobile ? 'grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-3`}>
            {featured.slice(0, isMobile ? 4 : 6).map((listing, i) => (
              <SneakerCard 
                key={listing.id} 
                sneaker={toSneakerShape(listing, true)} 
                index={i} 
              />
            ))}
          </div>
        )}
      </section>

      {/* New Arrivals Section */}
      <section className="section-padding max-w-7xl mx-auto pb-12">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-1">Just Dropped</p>
            <h2 className="font-display text-2xl font-bold">New Arrivals</h2>
          </div>
          <Link to="/shop" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            View All <ArrowIcon className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card h-48 animate-pulse" />
            ))}
          </div>
        ) : newArrivals.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-muted/10">
            <SneakerOutline className="w-32 h-16 text-muted-foreground/25 mx-auto mb-4" />
            <p className="font-display font-bold text-lg mb-2">No listings yet</p>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
              Be the first to list your sneakers
            </p>
            <Link to="/auth">
              <Button className="rounded-full h-10 px-5 text-sm">Start Selling</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {newArrivals.slice(0, isMobile ? 4 : 6).map((listing, i) => (
              <SneakerCard 
                key={listing.id} 
                sneaker={toSneakerShape(listing)} 
                index={i} 
              />
            ))}
          </div>
        )}
      </section>

      {/* Reviews - Lazy Loaded */}
      <Suspense fallback={null}>
        <Reviews />
      </Suspense>

      {/* CTA Banner */}
      <section className="section-padding max-w-7xl mx-auto pb-16">
        <div className="relative overflow-hidden rounded-2xl p-6 md:p-10 text-center bg-zinc-950 dark:bg-zinc-900 border border-zinc-800">
          {!isMobile && (
            <>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-primary/20 blur-[60px] rounded-full" />
              <div className="absolute inset-0 opacity-[0.03]" 
                style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} 
              />
            </>
          )}

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-white/60 font-medium">Sellers earning daily</span>
            </div>
            <h2 className="font-display text-xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
              Got Sneakers to Sell?
            </h2>
            <p className="text-white/50 text-sm md:text-base max-w-sm mx-auto mb-5">
              List in minutes. Reach buyers across Ghana. Get paid directly to MoMo.
            </p>
            <div className="flex justify-center gap-2">
              <Link to="/auth">
                <Button className="h-10 px-5 rounded-full text-sm bg-white text-zinc-900 hover:bg-white/90">
                  Start Selling <ArrowIcon className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              {!isMobile && (
                <Link to="/shop">
                  <Button variant="ghost" className="h-10 px-5 rounded-full text-sm text-white/60 hover:text-white hover:bg-white/5">
                    Browse Shop
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;