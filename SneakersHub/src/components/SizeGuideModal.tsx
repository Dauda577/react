import { X, Ruler } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

type SizeGuideCategory = "Sneakers" | "Tops" | "Bottoms" | "Outerwear" | "Activewear";

interface SizeGuideModalProps {
    category: SizeGuideCategory;
    onClose: () => void;
}

const SNEAKER_DATA = [
    { eu: 38, uk: 5, us: 6, cm: "24.0" },
    { eu: 39, uk: 6, us: 7, cm: "24.7" },
    { eu: 40, uk: 6.5, us: 7.5, cm: "25.3" },
    { eu: 41, uk: 7, us: 8, cm: "26.0" },
    { eu: 42, uk: 8, us: 9, cm: "26.7" },
    { eu: 43, uk: 9, us: 10, cm: "27.3" },
    { eu: 44, uk: 9.5, us: 10.5, cm: "28.0" },
    { eu: 45, uk: 10, us: 11, cm: "28.7" },
    { eu: 46, uk: 11, us: 12, cm: "29.3" },
    { eu: 47, uk: 12, us: 13, cm: "30.0" },
];

const TOPS_DATA = [
    { size: "XS", chest: "82–87", waist: "68–73" },
    { size: "S", chest: "88–93", waist: "74–79" },
    { size: "M", chest: "94–99", waist: "80–85" },
    { size: "L", chest: "100–105", waist: "86–91" },
    { size: "XL", chest: "106–111", waist: "92–97" },
    { size: "XXL", chest: "112–117", waist: "98–103" },
];

const BOTTOMS_DATA = [
    { size: "XS", waist: "68–72", hips: "88–92" },
    { size: "S", waist: "73–77", hips: "93–97" },
    { size: "M", waist: "78–82", hips: "98–102" },
    { size: "L", waist: "83–87", hips: "103–107" },
    { size: "XL", waist: "88–92", hips: "108–112" },
    { size: "XXL", waist: "93–98", hips: "113–118" },
];

const isSneaker = (cat: string) => cat === "Sneakers";
const isBottom = (cat: string) => ["Bottoms"].includes(cat);

const getDefaultTab = (cat: SizeGuideCategory) => {
    if (isSneaker(cat)) return "sneakers";
    if (isBottom(cat)) return "bottoms";
    return "tops";
};

const SizeGuideModal = ({ category, onClose }: SizeGuideModalProps) => {
    const [tab, setTab] = useState<"sneakers" | "tops" | "bottoms">(getDefaultTab(category));

    const showSneakers = isSneaker(category);
    const showClothing = !showSneakers;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center px-0 sm:px-4"
        >
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card border border-border rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-primary" />
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Size guide
                            </p>
                            <p className="text-sm font-bold text-foreground">{category}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Tabs — only show if category has multiple tables */}
                {showClothing && (
                    <div className="flex border-b border-border">
                        {(["tops", "bottoms"] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-all border-b-2 ${tab === t
                                        ? "border-primary text-foreground"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                )}

                {/* Table */}
                <div className="overflow-y-auto max-h-[60vh] px-5 py-4">
                    {/* Sneakers */}
                    {showSneakers && (
                        <>
                            <p className="text-xs text-muted-foreground mb-3">
                                Measure your foot length in cm and match to EU size.
                            </p>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        {["EU", "UK", "US (M)", "CM"].map((h) => (
                                            <th key={h} className="text-left pb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {SNEAKER_DATA.map((row, i) => (
                                        <tr key={row.eu} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                                            <td className="py-2 font-semibold text-foreground">{row.eu}</td>
                                            <td className="py-2 text-muted-foreground">{row.uk}</td>
                                            <td className="py-2 text-muted-foreground">{row.us}</td>
                                            <td className="py-2 text-muted-foreground">{row.cm}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}

                    {/* Tops */}
                    {showClothing && tab === "tops" && (
                        <>
                            <p className="text-xs text-muted-foreground mb-3">
                                Measure your chest at the fullest point (cm).
                            </p>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        {["Size", "Chest (cm)", "Waist (cm)"].map((h) => (
                                            <th key={h} className="text-left pb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {TOPS_DATA.map((row, i) => (
                                        <tr key={row.size} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                                            <td className="py-2 font-semibold text-foreground">{row.size}</td>
                                            <td className="py-2 text-muted-foreground">{row.chest}</td>
                                            <td className="py-2 text-muted-foreground">{row.waist}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}

                    {/* Bottoms */}
                    {showClothing && tab === "bottoms" && (
                        <>
                            <p className="text-xs text-muted-foreground mb-3">
                                Measure your natural waist and hips (cm).
                            </p>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        {["Size", "Waist (cm)", "Hips (cm)"].map((h) => (
                                            <th key={h} className="text-left pb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {BOTTOMS_DATA.map((row, i) => (
                                        <tr key={row.size} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                                            <td className="py-2 font-semibold text-foreground">{row.size}</td>
                                            <td className="py-2 text-muted-foreground">{row.waist}</td>
                                            <td className="py-2 text-muted-foreground">{row.hips}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-border bg-muted/20">
                    <p className="text-[11px] text-muted-foreground">
                        Between sizes? Size up for a comfortable fit.
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SizeGuideModal;