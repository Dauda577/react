import { motion } from "framer-motion";
import { Store, Truck, MessageCircle, MapPin, Clock, CheckCircle } from "lucide-react";

interface CheckoutDeliveryOptionsProps {
  onDeliveryMethodChange: (method: "pickup" | "delivery") => void;
  selectedMethod: "pickup" | "delivery" | null;
}

export const CheckoutDeliveryOptions = ({
  onDeliveryMethodChange,
  selectedMethod,
}: CheckoutDeliveryOptionsProps) => {
  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-bold">Delivery Method</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Store Pickup Option */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onDeliveryMethodChange("pickup")}
          className={`p-5 rounded-2xl border-2 transition-all text-left ${
            selectedMethod === "pickup"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                selectedMethod === "pickup"
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Store className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">Store Pickup</p>
                {selectedMethod === "pickup" && (
                  <CheckCircle className="w-5 h-5 text-primary" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Free pickup from our store. No delivery fee.
              </p>
              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> KNUST, Kumasi
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Mon-Sat, 9am - 6pm
                </p>
              </div>
            </div>
          </div>
        </motion.button>

        {/* Delivery Option */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onDeliveryMethodChange("delivery")}
          className={`p-5 rounded-2xl border-2 transition-all text-left ${
            selectedMethod === "delivery"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                selectedMethod === "delivery"
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Truck className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">Delivery</p>
                {selectedMethod === "delivery" && (
                  <CheckCircle className="w-5 h-5 text-primary" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                We'll contact you after payment to arrange delivery.
              </p>
              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> We'll call to confirm location
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Pay delivery fee to driver on arrival
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Delivery within 1-3 days after confirmation
                </p>
              </div>
            </div>
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
            Your order will be ready for pickup within 1-2 business days. You'll receive a notification 
            when it's ready. Please bring your order confirmation.
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