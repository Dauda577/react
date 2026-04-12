import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Copy, CheckCircle, Users, Tag, Zap, Share2, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useListings } from "@/context/ListingContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type Reward = {
    id: string;
    type: "discount" | "free_boost";
    discount_pct: number | null;
    promo_code: string;
    used: boolean;
    expires_at: string;
};

// ── Generate a referral code from user id ─────────────────────────────────────
function generateCode(userId: string) {
    return userId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

// Cache for referral data
const referralCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const ReferralCard = () => {
    const { user } = useAuth();
    const { listings, boostListing } = useListings();
    const [copied, setCopied] = useState(false);
    const [referralCode, setReferralCode] = useState<string | null>(null);
    const [referralCount, setReferralCount] = useState(0);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [myRank, setMyRank] = useState<number | null>(null); // 👈 add rank state

    const isSeller = user?.isSeller ?? user?.role === "seller";

    useEffect(() => {
        if (!user?.id) return;

        // Check cache first
        const cached = referralCache[user.id];
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setReferralCode(cached.data.code);
            setReferralCount(cached.data.count);
            setRewards(cached.data.rewards);
            setLoading(false);
            return;
        }

        fetchReferralData();
    }, [user?.id]);

    // 👇 Fetch seller rank
    useEffect(() => {
        if (!isSeller || !user?.id) return;
        supabase
            .from("seller_leaderboard")
            .select("id")
            .then(({ data }) => {
                if (!data) return;
                const rank = data.findIndex(s => s.id === user.id) + 1;
                if (rank > 0) setMyRank(rank);
            });
    }, [isSeller, user?.id]);

    const fetchReferralData = async () => {
        setLoading(true);
        try {
            const [{ data: profile }, { data: rewardData }] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("referral_code, referral_count")
                    .eq("id", user!.id)
                    .single(),
                supabase
                    .from("referral_rewards")
                    .select("*")
                    .eq("user_id", user!.id)
                    .eq("used", false)
                    .gt("expires_at", new Date().toISOString())
                    .order("created_at", { ascending: false }),
            ]);

            let code = profile?.referral_code;
            if (!code) {
                code = generateCode(user!.id);
                await supabase
                    .from("profiles")
                    .update({ referral_code: code })
                    .eq("id", user!.id);
            }

            setReferralCode(code);
            setReferralCount(profile?.referral_count ?? 0);
            setRewards(rewardData ?? []);

            // Cache the data
            if (user?.id) {
                referralCache[user.id] = {
                    data: { code, count: profile?.referral_count ?? 0, rewards: rewardData ?? [] },
                    timestamp: Date.now(),
                };
            }

            const firstDiscount = rewardData?.find(r => r.type === "discount" && !r.used);
            if (firstDiscount) {
                localStorage.setItem("pending_checkout_promo", JSON.stringify({
                    code: firstDiscount.promo_code,
                    discountPercent: firstDiscount.discount_pct,
                }));
            }
        } catch {
            // Silent fail
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!referralCode) return;
        await navigator.clipboard.writeText(referralCode);
        setCopied(true);
        toast.success("Referral code copied!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (!referralCode) return;
        const shareText = `Join me on SneakersHub — Ghana's fashion marketplace! Use my referral code ${referralCode} when signing up and get 15% off your first purchase. 👟 https://sneakershub.site/auth?ref=${referralCode}`;

        if (navigator.share) {
            try {
                await navigator.share({ title: "Join SneakersHub", text: shareText });
            } catch { /* user cancelled */ }
        } else {
            await navigator.clipboard.writeText(shareText);
            toast.success("Share text copied to clipboard!");
        }
    };

    // Show minimal skeleton while loading
    if (loading) return (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10" />
                <div className="flex-1">
                    <div className="h-4 w-24 bg-muted rounded mb-2" />
                    <div className="h-3 w-48 bg-muted rounded" />
                </div>
            </div>
            <div className="h-16 bg-muted rounded-xl" />
            <div className="flex gap-2">
                <div className="flex-1 h-10 bg-muted rounded-xl" />
                <div className="w-20 h-10 bg-muted rounded-xl" />
            </div>
        </div>
    );

    const maxReferrals = 15;
    const remaining = maxReferrals - referralCount;
    const isMaxedOut = referralCount >= maxReferrals;

    return (
        <div className="space-y-4">

            {/* ── Main referral card ── */}
            <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Gift className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="font-display font-bold text-sm">Refer & Earn</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Share your code — you both get 15% off Official Products + you get a free listing boost
                        </p>
                    </div>
                </div>

                {/* Code display */}
                <div className="flex items-center gap-2">
                    <div className={`flex-1 px-4 py-3 rounded-xl border transition-all ${isMaxedOut
                        ? "bg-muted/50 border-amber-500/30"
                        : "bg-background border-border"
                        }`}>
                        <p className="text-xs text-muted-foreground mb-0.5">Your referral code</p>
                        <p className={`font-display font-bold text-lg tracking-[0.2em] ${isMaxedOut ? "text-muted-foreground line-through" : "text-primary"
                            }`}>
                            {referralCode ?? "—"}
                        </p>
                    </div>
                    <button
                        onClick={handleCopy}
                        disabled={isMaxedOut}
                        className={`p-3 rounded-xl border transition-all ${isMaxedOut
                            ? "border-border bg-muted/30 text-muted-foreground cursor-not-allowed"
                            : "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
                            }`}
                    >
                        {copied
                            ? <CheckCircle className="w-4 h-4 text-green-500" />
                            : <Copy className="w-4 h-4" />}
                    </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={handleShare}
                        disabled={isMaxedOut}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-opacity ${isMaxedOut
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-primary text-primary-foreground hover:opacity-90"
                            }`}
                    >
                        <Share2 className="w-3.5 h-3.5" /> Share Code
                    </button>
                    <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-background text-xs font-medium text-muted-foreground">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        <span><span className="font-bold text-foreground">{referralCount}</span> / {maxReferrals} referrals</span>
                    </div>
                </div>

                {/* Maxed out warning */}
                {isMaxedOut && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <Users className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <p className="text-xs text-amber-700 font-medium">
                            You've reached the maximum of {maxReferrals} referrals — your code is no longer active.
                        </p>
                    </div>
                )}

                {/* Remaining referrals */}
                {referralCount > 0 && !isMaxedOut && (
                    <p className="text-[11px] text-muted-foreground text-center">
                        {remaining} referral{remaining !== 1 ? "s" : ""} remaining
                    </p>
                )}
            </motion.div>

            {/* 👇 Seller Rank Card - shows for sellers only */}
            {isSeller && myRank && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-4"
                >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1">
                        <p className="font-display font-bold text-sm">
                            {myRank <= 3
                                ? `You're ${["🥇 #1", "🥈 #2", "🥉 #3"][myRank - 1]} on the leaderboard!`
                                : `You're ranked #${myRank} on the leaderboard`
                            }
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Keep selling to climb higher
                        </p>
                    </div>
                    <Link to="/leaderboard" className="text-xs text-primary font-semibold hover:opacity-70 transition-opacity flex-shrink-0">
                        View all →
                    </Link>
                </motion.div>
            )}

            {/* ── Active rewards ── */}
            {rewards.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-border bg-card p-5 space-y-3"
                >
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
                        Your Active Rewards
                    </p>
                    {rewards.map(reward => (
                        <div key={reward.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                                ${reward.type === "discount" ? "bg-green-500/10" : "bg-purple-500/10"}`}>
                                {reward.type === "discount"
                                    ? <Tag className="w-3.5 h-3.5 text-green-600" />
                                    : <Zap className="w-3.5 h-3.5 text-purple-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">
                                    {reward.type === "discount"
                                        ? `${reward.discount_pct}% Discount`
                                        : "Free Listing Boost"}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Code: <span className="font-mono font-bold text-foreground">{reward.promo_code}</span>
                                    {" · "}Expires {new Date(reward.expires_at).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}
                                </p>
                                {reward.type === "discount" && (
                                    <p className="text-[11px] text-green-600 font-semibold mt-1">
                                        💡 Use at checkout on Official Products
                                    </p>
                                )}
                                {reward.type === "free_boost" && (
                                    <p className="text-[11px] text-purple-600 font-semibold mt-1">
                                        ⚡ Boosts your 10 most recent listings for 7 days
                                    </p>
                                )}
                            </div>

                            {/* Copy for discount, Redeem for boost */}
                            {reward.type === "discount" ? (
                                <button
                                    onClick={async () => {
                                        await navigator.clipboard.writeText(reward.promo_code);
                                        toast.success("Code copied — paste it at checkout!");
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                                >
                                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                            ) : (
                                <button
                                    onClick={async () => {
                                        try {
                                            await supabase
                                                .from("referral_rewards")
                                                .update({ used: true })
                                                .eq("id", reward.id);

                                            const myListings = listings
                                                .filter(l => l.status === "active")
                                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                .slice(0, 10);

                                            await Promise.all(myListings.map(l => boostListing(l.id, 7))); // 7 days for referral

                                            toast.success(`🚀 Your ${myListings.length} listing${myListings.length !== 1 ? "s are" : " is"} now featured for 7 days!`);

                                            if (user?.id) {
                                                delete referralCache[user.id];
                                            }
                                            fetchReferralData();
                                        } catch {
                                            toast.error("Failed to redeem boost. Please try again.");
                                        }
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-xs font-bold hover:bg-purple-600 transition-colors flex-shrink-0 flex items-center gap-1"
                                >
                                    <Zap className="w-3 h-3" /> Redeem
                                </button>
                            )}
                        </div>
                    ))}
                </motion.div>
            )}

        </div>
    );
};

export default ReferralCard;