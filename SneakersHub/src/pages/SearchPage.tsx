import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import SneakerCard from "@/components/SneakerCard";
import { PRODUCT_CATEGORIES } from "@/data/sneakers";
import { usePublicListings } from "@/context/PublicListingsContext";

const SearchPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const inputRef = useRef<HTMLInputElement>(null);
    const { listings } = usePublicListings();

    const initialQuery = searchParams.get("q") ?? "";
    const initialCategory = searchParams.get("category") ?? "All";

    const [query, setQuery] = useState(initialQuery);
    const [activeCategory, setActiveCategory] = useState(initialCategory);
    const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

    // Autofocus on mount
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    // Debounce the query for snappy feel without hammering on every keystroke
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
            // Keep URL in sync
            const params: Record<string, string> = {};
            if (query.trim()) params.q = query.trim();
            if (activeCategory !== "All") params.category = activeCategory;
            setSearchParams(params, { replace: true });
        }, 250);
        return () => clearTimeout(timer);
    }, [query, activeCategory]);

    // Filter in-memory from the already-loaded public listings context
    const results = useMemo(() => {
        const trimmed = debouncedQuery.trim().toLowerCase();
        if (!trimmed) return [];

        return listings.filter((l) => {
            const matchesCategory = activeCategory === "All" || l.category === activeCategory;
            const matchesQuery =
                l.name.toLowerCase().includes(trimmed) ||
                l.brand.toLowerCase().includes(trimmed) ||
                (l.description ?? "").toLowerCase().includes(trimmed);
            return matchesCategory && matchesQuery;
        });
    }, [debouncedQuery, activeCategory, listings]);

    const hasSearched = debouncedQuery.trim().length > 0;

    const clearQuery = () => {
        setQuery("");
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

                    {/* Results grid */}
                    {hasSearched && results.length > 0 && (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <p className="text-xs text-muted-foreground mb-4">
                                {results.length} result{results.length !== 1 ? "s" : ""} for{" "}
                                <span className="font-semibold text-foreground">"{debouncedQuery.trim()}"</span>
                                {activeCategory !== "All" && (
                                    <> in <span className="font-semibold text-foreground">{activeCategory}</span></>
                                )}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {results.map((l, i) => (
                                    <SneakerCard
                                        key={l.id}
                                        index={i}
                                        sneaker={{
                                            id: l.id,
                                            name: l.name,
                                            brand: l.brand,
                                            price: l.price,
                                            image: l.image ?? "",
                                            category: l.category,
                                            sizes: l.sizes,
                                            description: l.description ?? "",
                                            isBoosted: l.boosted,
                                            sellerVerified: l.sellerVerified,
                                            sellerIsOfficial: l.sellerIsOfficial,
                                            discountPercent: l.discountPercent,
                                            sellerId: l.sellerId,
                                            sellerName: l.sellerName,
                                        }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* No results */}
                    {hasSearched && results.length === 0 && (
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

                    {/* Idle state */}
                    {!hasSearched && (
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