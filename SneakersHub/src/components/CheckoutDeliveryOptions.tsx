import { motion } from "framer-motion";
import { Store, Truck, MessageCircle, MapPin, Clock, CheckCircle, Phone } from "lucide-react";

interface CheckoutDeliveryOptionsProps {
  onDeliveryMethodChange: (method: "pickup" | "delivery") => void;
  selectedMethod: "pickup" | "delivery" | null;
  sellerCity?: string | null;
  sellerRegion?: string | null;
  sellerName?: string | null;
}

export const CheckoutDeliveryOptions = ({
  onDeliveryMethodChange,
  selectedMethod,
  sellerCity,
  sellerRegion,
  sellerName,
}: CheckoutDeliveryOptionsProps) => {
  const pickupLocation =
    sellerCity && sellerRegion
      ? `${sellerCity}, ${sellerRegion}`
      : sellerCity
      ? sellerCity
      : sellerRegion
      ? sellerRegion
      : "Seller will confirm location";

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-bold">Delivery Method</h3>

      <div className="flex flex-col gap-3">
        {/* Store Pickup Option */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onDeliveryMethodChange("pickup")}
          className={`p-4 rounded-2xl border-2 transition-all text-left ${
            selectedMethod === "pickup"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
              selectedMethod === "pickup" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}>
              <Store className="w-5 h-5" />
            </div>

            {/* Title + badge */}
            <div className="w-28 flex-shrink-0">
              <p className="font-semibold text-foreground text-sm">Store Pickup</p>
              <p className="text-xs text-green-600 font-medium mt-0.5">Free</p>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px self-stretch bg-border mx-1" />

            {/* Bullets */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 min-w-0">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 min-w-0">
                <MapPin className="w-3 h-3 flex-shrink-0 text-primary" />
                <span className="truncate">{pickupLocation}</span>
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3 flex-shrink-0 text-primary" />
                <span>Ready in 1–2 days</span>
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3 h-3 flex-shrink-0 text-primary" />
                <span>Seller confirms time</span>
              </p>
            </div>

            {/* Check */}
            {selectedMethod === "pickup" && (
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 ml-2" />
            )}
          </div>
        </motion.button>

        {/* Delivery Option */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onDeliveryMethodChange("delivery")}
          className={`p-4 rounded-2xl border-2 transition-all text-left ${
            selectedMethod === "delivery"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
              selectedMethod === "delivery" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}>
              <Truck className="w-5 h-5" />
            </div>

            {/* Title + badge */}
            <div className="w-28 flex-shrink-0">
              <p className="font-semibold text-foreground text-sm">Delivery</p>
              <p className="text-xs text-amber-600 font-medium mt-0.5">Fee on arrival</p>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px self-stretch bg-border mx-1" />

            {/* Bullets */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 min-w-0">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MessageCircle className="w-3 h-3 flex-shrink-0 text-primary" />
                <span>We'll call to confirm</span>
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Truck className="w-3 h-3 flex-shrink-0 text-primary" />
                <span>Pay driver on arrival</span>
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3 flex-shrink-0 text-primary" />
                <span>1–3 days after confirm</span>
              </p>
            </div>

            {/* Check */}
            {selectedMethod === "delivery" && (
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 ml-2" />
            )}
          </div>
        </motion.button>
      </div>

      {/* Info Banner */}
      <div className="mt-4 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
        <div className="flex gap-3">
          <MessageCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">How delivery works:</p>
            <p className="text-xs text-muted-foreground mt-1">
              After placing your order, we'll contact you within 24 hours to confirm your delivery
              location and calculate the exact delivery fee. You'll pay the delivery fee directly
              to the driver when your order arrives.
            </p>
          </div>
        </div>
      </div>

      {/* Store Pickup Info */}
      {selectedMethod === "pickup" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-500/10 rounded-xl border border-green-500/20"
        >
          <p className="text-sm font-semibold text-green-600">Store Pickup Selected</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your order will be ready for pickup within 1–2 business days.{" "}
            {sellerName ? `${sellerName} will` : "The seller will"} contact you when it's ready.
            Please bring your order confirmation.
          </p>
        </motion.div>
      )}

      {/* Delivery Info */}
      {selectedMethod === "delivery" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20"
        >
          <p className="text-sm font-semibold text-amber-600">Delivery Selected</p>
          <p className="text-xs text-muted-foreground mt-1">
            You'll pay only for the product now. We'll contact you via phone to arrange delivery
            details and confirm the delivery fee based on your location.
          </p>
        </motion.div>
      )}
    </div>
  );
};