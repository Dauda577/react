import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Trophy, Star, ShoppingBag, Store, Sparkles, BadgeCheck, MapPin, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

type LeaderboardEntry = {
    id: string;
    name: string;
    avatar_url: string | null;
    verified: boolean;
    is_official: boolean;
    city: string | null;
    region: string | null;
    total_orders: number;
    total_sales: number;
    avg_rating: number | null;
    review_count: number;
    active_listings: number;
};

const medals = ["🥇", "🥈", "🥉"];

const getRankColor = (rank: number) => {
    if (rank === 1) return "from-amber-500/20 to-yellow-500/5 border-amber-500/30";
    if (rank === 2) return "from-slate-400/20 to-slate-300/5 border-slate-400/30";
    if (rank === 3) return "from-orange-600/20 to-orange-500/5 border-orange-600/30";
    return "from-transparent to-transparent border-border";
};

export default function Leaderboard() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [sellers, setSellers] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<"all" | "month">("all");

    // Redirect non-sellers away
    useEffect(() => {
        if (authLoading) return;
        if (!user || user.role !== "seller") {
            navigate("/account", { replace: true });
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        fetchLeaderboard();
    }, [period]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("seller_leaderboard")
            .select("*")
            .limit(20);

        if (!error && data) setSellers(data as LeaderboardEntry[]);
        setLoading(false);
    };

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </main>
                <Footer />
            </div>
        );
    }

    // If not seller, don't render anything (will redirect)
    if (!user || user.role !== "seller") {
        return null;
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <main
                className="flex-1 max-w-2xl mx-auto w-full px-4 py-8"
                style={{ paddingTop: `calc(96px + env(safe-area-inset-top, 0px))` }}
            >
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-7 h-7 text-amber-500" />
                    </div>
                    <h1 className="font-display text-3xl font-bold tracking-tight">Top Sellers</h1>
                    <p className="text-muted-foreground text-sm mt-2">
                        Ghana's best sellers on SneakersHub ranked by sales
                    </p>
                </motion.div>

                {/* Loading */}
                {loading && (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
                        ))}
                    </div>
                )}

                {/* Leaderboard */}
                {!loading && sellers.length === 0 && (
                    <div className="text-center py-20">
                        <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">No sellers on the leaderboard yet.</p>
                    </div>
                )}

                {!loading && sellers.length > 0 && (
                    <div className="space-y-3">
                        {sellers.map((seller, index) => {
                            const rank = index + 1;
                            return (
                                <motion.div
                                    key={seller.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`relative rounded-2xl border bg-gradient-to-r p-4 flex items-center gap-4 ${getRankColor(rank)}`}
                                >
                                    {/* Rank */}
                                    <div className="flex-shrink-0 w-10 text-center">
                                        {rank <= 3
                                            ? <span className="text-2xl">{medals[rank - 1]}</span>
                                            : <span className="font-display font-bold text-lg text-muted-foreground">#{rank}</span>
                                        }
                                    </div>

                                    {/* Avatar */}
                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden
                    ${seller.is_official
                                            ? "bg-gradient-to-br from-violet-900 to-indigo-900 border border-violet-500/30"
                                            : "bg-primary/10"
                                        }`}>
                                        {seller.is_official
                                            ? <Sparkles className="w-5 h-5" style={{ color: "#a78bfa" }} />
                                            : seller.avatar_url
                                                ? <img src={seller.avatar_url} alt={seller.name} className="w-full h-full object-cover" />
                                                : <span className="font-display font-bold text-primary">{seller.name[0]?.toUpperCase()}</span>
                                        }
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <p className="font-display font-bold text-sm truncate">{seller.name}</p>
                                            {seller.is_official && (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                                    style={{ background: "rgba(109,40,217,0.15)", color: "#a78bfa", border: "1px solid rgba(109,40,217,0.3)" }}>
                                                    <Sparkles className="w-2.5 h-2.5" /> Official
                                                </span>
                                            )}
                                            {seller.verified && !seller.is_official && (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full border border-green-500/20">
                                                    <BadgeCheck className="w-2.5 h-2.5" /> Verified
                                                </span>
                                            )}
                                        </div>

                                        {(seller.city || seller.region) && (
                                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                <MapPin className="w-2.5 h-2.5" />
                                                {[seller.city, seller.region].filter(Boolean).join(", ")}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                <ShoppingBag className="w-3 h-3 text-primary" />
                                                {seller.total_orders} orders
                                            </span>
                                            {seller.avg_rating && (
                                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                    {seller.avg_rating} ({seller.review_count})
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                <Store className="w-3 h-3 text-primary" />
                                                {seller.active_listings} listings
                                            </span>
                                        </div>
                                    </div>

                                    {/* Sales */}
                                    <div className="flex-shrink-0 text-right">
                                        <p className="font-display font-bold text-sm text-primary">
                                            GHS {seller.total_sales.toLocaleString()}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">total sales</p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}