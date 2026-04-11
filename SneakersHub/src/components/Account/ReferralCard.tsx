import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Copy, CheckCircle, Users, Tag, Zap, Share2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

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

export const ReferralCard = () => {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);
    const [referralCode, setReferralCode] = useState<string | null>(null);
    const [referralCount, setReferralCount] = useState(0);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        fetchReferralData();
    }, [user?.id]);

    const fetchReferralData = async () => {
        setLoading(true);
        try {
            // Get or generate referral code
            const { data: profile } = await supabase
                .from("profiles")
                .select("referral_code, referral_count")
                .eq("id", user!.id)
                .single();

            let code = profile?.referral_code;

            // If no code yet, generate and save one
            if (!code) {
                code = generateCode(user!.id);
                await supabase
                    .from("profiles")
                    .update({ referral_code: code })
                    .eq("id", user!.id);
            }

            setReferralCode(code);
            setReferralCount(profile?.referral_count ?? 0);

            // Fetch unused rewards
            const { data: rewardData } = await supabase
                .from("referral_rewards")
                .select("*")
                .eq("user_id", user!.id)
                .eq("used", false)
                .gt("expires_at", new Date().toISOString())
                .order("created_at", { ascending: false });

            setRewards(rewardData ?? []);

            // Save first unused discount reward for auto-apply at checkout
            const firstDiscount = rewardData?.find(r => r.type === "discount" && !r.used);
            if (firstDiscount) {
                localStorage.setItem("pending_checkout_promo", JSON.stringify({
                    code: firstDiscount.promo_code,
                    discountPercent: firstDiscount.discount_pct,
                }));
            }
        } catch {
            // Silent fail — non-critical UI
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

    if (loading) return (
        <div className="rounded-2xl border border-border bg-card p-5 animate-pulse h-40" />
    );

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
                    <div className="flex-1 px-4 py-3 rounded-xl bg-background border border-border">
                        <p className="text-xs text-muted-foreground mb-0.5">Your referral code</p>
                        <p className="font-display font-bold text-lg tracking-[0.2em] text-primary">
                            {referralCode ?? "—"}
                        </p>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="p-3 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                        {copied
                            ? <CheckCircle className="w-4 h-4 text-green-500" />
                            : <Copy className="w-4 h-4 text-muted-foreground" />}
                    </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={handleShare}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                        <Share2 className="w-3.5 h-3.5" /> Share Code
                    </button>
                    <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-background text-xs font-medium text-muted-foreground">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        <span><span className="font-bold text-foreground">{referralCount}</span> referral{referralCount !== 1 ? "s" : ""}</span>
                    </div>
                </div>
            </motion.div>

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
                                {/* Clear call to action for discount codes */}
                                {reward.type === "discount" && (
                                    <p className="text-[11px] text-green-600 font-semibold mt-1">
                                        💡 Use at checkout on Official Products
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={async () => {
                                    await navigator.clipboard.writeText(reward.promo_code);
                                    toast.success("Code copied — paste it at checkout!");
                                }}
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0 flex items-center gap-1"
                            >
                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                        </div>
                    ))}
                </motion.div>
            )}

        </div>
    );
};

export default ReferralCard;