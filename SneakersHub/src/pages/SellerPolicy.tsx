import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Shield, AlertCircle, CheckCircle, FileText,
    ArrowLeft, Store, BadgeCheck, Ban, Scale,
    Clock, Tag, Info
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const sections = [
    {
        id: "section-1",
        number: "1.",
        title: "Platform Overview",
        content: (
            <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                    SneakersHub is an independent peer-to-peer resale marketplace. We provide a platform for
                    individuals to buy and sell sneakers they personally own. SneakersHub does not source,
                    manufacture, stock, or directly sell any products listed on this platform.
                </p>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm">
                            SneakersHub is not affiliated with, endorsed by, or partnered with Nike, Adidas,
                            Timberland, New Balance, Puma, or any other brand whose products may appear on
                            the platform.
                        </p>
                    </div>
                </div>
            </div>
        ),
    },
    {
        id: "section-2",
        number: "2.",
        title: "Seller Eligibility",
        content: (
            <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                    To list on SneakersHub, you must be the rightful owner of the item you are listing.
                    By creating a listing, you confirm that:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>You acquired the item through legitimate means (authorized retailer, another individual, or licensed reseller)</li>
                    <li>You have the full legal right to sell the item</li>
                    <li>You are at least 18 years old or have parental/guardian consent</li>
                    <li>The information provided in your listing is accurate and truthful</li>
                </ul>
            </div>
        ),
    },
    {
        id: "section-3",
        number: "3.",
        title: "Authenticity Requirement",
        content: (
            <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                    All items listed on SneakersHub must be 100% authentic.
                </p>
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-600 dark:text-red-400">
                            Listing counterfeit, replica, or unauthorized reproductions of branded products
                            is strictly prohibited and will result in immediate account suspension and removal
                            of all listings.
                        </p>
                    </div>
                </div>
                <p className="leading-relaxed">
                    SneakersHub reserves the right to require proof of authenticity at any time and
                    to remove any listing suspected of being inauthentic.
                </p>
            </div>
        ),
    },
    {
        id: "section-4",
        number: "4.",
        title: "Accurate Representation",
        content: (
            <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">Sellers are required to accurately represent their items:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Clearly state condition — new, used, or worn</li>
                    <li>Provide correct size, colorway, and model information</li>
                    <li>Disclose any defects, signs of wear, or damage</li>
                    <li>Upload photos of the actual item being sold (no stock images)</li>
                    <li>Set a fair and accurate price</li>
                </ul>
                <p className="leading-relaxed">
                    Misleading descriptions or photos are a violation of this policy and may result
                    in account termination and liability for any resulting disputes.
                </p>
            </div>
        ),
    },
    {
        id: "section-5",
        number: "5.",
        title: "Prohibited Listings",
        content: (
            <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">The following are strictly prohibited on SneakersHub:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Counterfeit, fake, or replica items</li>
                    <li>Stolen goods</li>
                    <li>Items with removed or altered brand labels</li>
                    <li>Items that violate any applicable laws or regulations</li>
                    <li>Any item the seller does not personally own</li>
                    <li>Items prohibited under Ghanaian law</li>
                </ul>
                <p className="leading-relaxed">
                    SneakersHub will remove any listing that violates this policy without prior notice
                    and may report serious violations to relevant authorities.
                </p>
            </div>
        ),
    },
    {
        id: "section-6",
        number: "6.",
        title: "Seller Responsibility",
        content: (
            <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                    Sellers are solely responsible for the accuracy, legality, and authenticity of
                    their listings. SneakersHub acts only as an intermediary platform and bears no
                    liability for disputes arising from seller misrepresentation.
                </p>
                <p className="leading-relaxed">
                    By listing on this platform, sellers agree to indemnify SneakersHub against any
                    claims, losses, or damages resulting from their listings or conduct on the platform.
                </p>
            </div>
        ),
    },
    {
        id: "section-7",
        number: "7.",
        title: "Brand Disclaimer",
        content: (
            <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                    Brand names, logos, and trademarks such as Nike®, Adidas®, Timberland®, and others
                    are the property of their respective owners.
                </p>
                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                    <p className="text-sm leading-relaxed">
                        Their appearance on this platform reflects secondary market resale by individual
                        sellers and does not imply any affiliation, sponsorship, or endorsement of
                        SneakersHub by those brands.
                    </p>
                </div>
            </div>
        ),
    },
    {
        id: "section-8",
        number: "8.",
        title: "Policy Enforcement",
        content: (
            <div className="space-y-3 text-muted-foreground">
                <p className="leading-relaxed">
                    SneakersHub reserves the right to remove any listing, suspend any account, or take
                    any other action deemed necessary to ensure compliance with this policy.
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>First violation: listing removal and warning</li>
                    <li>Repeated violations: account suspension</li>
                    <li>Serious violations: permanent ban and possible legal action</li>
                </ul>
                <p className="leading-relaxed">
                    This policy may be updated at any time. Continued use of the platform after updates
                    constitutes acceptance of the revised policy.
                </p>
            </div>
        ),
    },
];

const SellerPolicy = () => {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div
                className="pt-24 section-padding max-w-4xl mx-auto pb-20"
                style={{ paddingTop: `calc(96px + env(safe-area-inset-top, 0px))` }}
            >
                {/* Back Button */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-10"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                            Legal · Marketplace Rules
                        </span>
                    </div>
                    <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Seller <span className="text-gradient">Policy</span>
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Last updated:{" "}
                        {new Date().toLocaleDateString("en-GH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </p>
                </motion.div>

                {/* Effective Date Notice */}
                <div className="rounded-2xl border border-border bg-muted/20 p-4 mb-8">
                    <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold">
                                Effective Date:{" "}
                                {new Date().toLocaleDateString("en-GH", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                By selling on SneakersHub, you agree to this policy. Please read it carefully.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Table of Contents */}
                <div className="rounded-2xl border border-border bg-card p-6 mb-8">
                    <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" /> Table of Contents
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {sections.map((s) => (
                            <a
                                key={s.id}
                                href={`#${s.id}`}
                                className="text-muted-foreground hover:text-primary transition-colors"
                            >
                                {s.number} {s.title}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Sections */}
                <div className="space-y-8">
                    {sections.map((s, i) => (
                        <motion.section
                            key={s.id}
                            id={s.id}
                            className="scroll-mt-24"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: i * 0.05 }}
                        >
                            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
                                <span className="text-primary">{s.number}</span> {s.title}
                            </h2>
                            {s.content}
                        </motion.section>
                    ))}
                </div>

                {/* Acceptance Footer */}
                <div className="mt-12 p-6 rounded-2xl bg-primary/5 border border-primary/20 text-center">
                    <CheckCircle className="w-8 h-8 text-primary mx-auto mb-3" />
                    <p className="text-sm font-semibold mb-1">
                        By listing on SneakersHub, you acknowledge that you have read, understood, and
                        agree to this Seller Policy.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Last updated:{" "}
                        {new Date().toLocaleDateString("en-GH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </p>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default SellerPolicy;