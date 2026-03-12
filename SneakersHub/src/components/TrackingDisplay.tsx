import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Copy, ExternalLink, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface TrackingDisplayProps {
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: "pending" | "shipped" | "delivered";
  sellerConfirmed: boolean;
}

export const TrackingDisplay = ({
  trackingNumber,
  trackingUrl,
  status,
  sellerConfirmed,
}: TrackingDisplayProps) => {
  const [copied, setCopied] = useState(false);

  if (!trackingNumber) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingNumber);
    setCopied(true);
    toast.success("Tracking number copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
          Tracking Number
        </p>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <Package className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-600 break-all">
              {trackingNumber}
            </p>
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1 mt-0.5 w-fit"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                Track your package →
              </a>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-1.5 rounded-lg border border-blue-500/30 hover:bg-blue-500/10 transition-colors"
            title="Copy tracking number"
          >
            {copied ? (
              <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-blue-500" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};