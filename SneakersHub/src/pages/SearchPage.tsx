import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowLeft, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import SneakerCard from "@/components/SneakerCard";
import { PRODUCT_CATEGORIES } from "@/data/sneakers";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
    id: string;
    name: string;
    brand: string;
    price: number;
    image: string | null;
    category: string;
    sizes: number[];
    description: string;
    isBoosted?: boolean;
    sellerVerified?: boolean;
    sellerIsOfficial?: boolean;
    isNew?: boolean;
    discountPercent?: number | null;
    sellerId?: string;
    sellerName?: string;
    sellerSubaccountCode?: string | null;
    sellerCity?: string | null;
    sellerRegion?: string | null;
    shippingCost?: number;
    handlingTime?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SearchPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const inputRef = useRef<HTMLInputElement>(null);

    const initialQuery = searchParams.get("q") ?? "";
    const initialCategory = searchParams.get("category") ?? "All";

    const [query, setQuery] = useState(initialQuery);
    const [activeCategory, setActiveCategory] = useState(initialCategory);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(!!initialQuery);

    // Autofocus on mount
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    // Run search whenever query or category changes (debounced)
    const runSearch = useCallback(async (q: string, category: string) => {
        const trimmed = q.trim();
        if (!trimmed) {
            setResults([]);
            setSearched(false);
            return;
        }

        setLoading(true);
        setSearched(true);

        try {
            let dbQuery = supabase
                .from("listings")
                .select(`
          id, name, brand, price, image, category, sizes, description,
          is_boosted, discount_percent, is_new, seller_id,
          profiles!listings_seller_id_fkey (
            name, verified, is_official, subaccount_code, city, region, shipping_cost, handling_time
          )
        `)
                .eq("status", "active")
                .or(`name.ilike.%${trimmed}%,brand.ilike.%${trimmed}%,description.ilike.%${trimmed}%`)
                .order("is_boosted", { ascending: false })
                .order("created_at", { ascending: false })
                .limit(40);

            if (category !== "All") {
                dbQuery = dbQuery.eq("category", category);
            }

            const { data, error } = await dbQuery;
            if (error) throw error;

            const mapped: SearchResult[] = (data ?? []).map((row: any) => ({
                id: row.id,
                name: row.name,
                brand: row.brand,
                price: row.price,
                image: row.image,
                category: row.category,
                sizes: row.sizes ?? [],
                description: row.description ?? "",
                isBoosted: row.is_boosted ?? false,
                discountPercent: row.discount_percent ?? null,
                isNew: row.is_new ?? false,
                sellerId: row.seller_id,
                sellerName: row.profiles?.name ?? "",
                sellerVerified: row.profiles?.verified ?? false,
                sellerIsOfficial: row.profiles?.is_official ?? false,
                sellerSubaccountCode: row.profiles?.subaccount_code ?? null,
                sellerCity: row.profiles?.city ?? null,
                sellerRegion: row.profiles?.region ?? null,
                shippingCost: row.profiles?.shipping_cost ?? 0,
                handlingTime: row.profiles?.handling_time ?? "Ships in 1-3 days",
            }));

            setResults(mapped);
        } catch (err) {
            console.error("Search error:", err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            runSearch(query, activeCategory);
            // Keep URL in sync
            const params: Record<string, string> = {};
            if (query.trim()) params.q = query.trim();
            if (activeCategory !== "All") params.category = activeCategory;
            setSearchParams(params, { replace: true });
        }, 350);
        return () => clearTimeout(timer);
    }, [query, activeCategory, runSearch]);

    const clearQuery = () => {
        setQuery("");
        setResults([]);
        setSearched(false);
        inputRef.current?.focus();
    };

    const categories = ["All", ...PRODUCT_CATEGORIES.map((c) => c.label)];

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div
                className="max-w-3xl mx-auto px-4 sm:px-6 pb-20"
                style={{ paddingTop: `calc(64px + env(safe-area-inset-top, 0px) + 24px)` }}
            >
                {/* Search Input */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mb-5"
                >
                    <div className="relative flex items-center gap-3">
                        {/* Back button on mobile */}
                        <button
                            onClick={() => navigate(-1)}
                            className="md:hidden flex-shrink-0 p-2 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground"
                            aria-label="Go back"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search sneakers, brands, watches..."
                                className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-border bg-card text-sm text-foreground
                  placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15
                  transition-all font-[inherit] shadow-sm"
                            />
                            {query && (
                                <button
                                    onClick={clearQuery}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                                    aria-label="Clear search"
                                >
                                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Category Filter Pills */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.05 }}
                    className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0"
                >
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${activeCategory === cat
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </motion.div>

                {/* Results */}
                <AnimatePresence mode="wait">

                    {/* Loading skeleton */}
                    {loading && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                        >
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="rounded-2xl bg-card border border-border overflow-hidden">
                                    <div className="aspect-square bg-muted animate-pulse" />
                                    <div className="p-3.5 space-y-2">
                                        <div className="h-2.5 bg-muted animate-pulse rounded-full w-1/3" />
                                        <div className="h-3 bg-muted animate-pulse rounded-full w-3/4" />
                                        <div className="h-3 bg-muted animate-pulse rounded-full w-1/2" />
                                        <div className="h-4 bg-muted animate-pulse rounded-full w-2/5 mt-1" />
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* Results grid */}
                    {!loading && searched && results.length > 0 && (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <p className="text-xs text-muted-foreground mb-4">
                                {results.length} result{results.length !== 1 ? "s" : ""} for{" "}
                                <span className="font-semibold text-foreground">"{query.trim()}"</span>
                                {activeCategory !== "All" && (
                                    <> in <span className="font-semibold text-foreground">{activeCategory}</span></>
                                )}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {results.map((item, i) => (
                                    <SneakerCard key={item.id} sneaker={item} index={i} />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* No results */}
                    {!loading && searched && results.length === 0 && (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-20"
                        >
                            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                <Search className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <p className="font-display font-bold text-lg mb-1">No results found</p>
                            <p className="text-sm text-muted-foreground">
                                Try a different spelling or browse{" "}
                                <button
                                    onClick={() => navigate("/shop")}
                                    className="text-primary underline underline-offset-2"
                                >
                                    all products
                                </button>
                            </p>
                        </motion.div>
                    )}

                    {/* Empty state — nothing typed yet */}
                    {!loading && !searched && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-20"
                        >
                            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Search className="w-6 h-6 text-primary" />
                            </div>
                            <p className="font-display font-bold text-lg mb-1">What are you looking for?</p>
                            <p className="text-sm text-muted-foreground">
                                Search by name, brand, or category
                            </p>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
};

export default SearchPage;