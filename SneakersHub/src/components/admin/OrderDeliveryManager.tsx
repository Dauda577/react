import { useState } from "react";
import { motion } from "framer-motion";
import {
  Phone, MessageCircle, Truck, CheckCircle,
  Loader2, MapPin, DollarSign, Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useOrders } from "@/context/OrderContext";
import { useMessages } from "@/context/MessageContext";
import { useAuth } from "@/context/AuthContext";

interface OrderDeliveryManagerProps {
  order: {
    id: string;
    customerName: string;
    customerPhone: string;
    customerId: string;        // buyer's user ID — needed to send a message
    deliveryMethod: "pickup" | "delivery";
    deliveryStatus: string;
    deliveryFee?: number;
    deliveryLocation?: string;
    items: { name: string }[];
  };
  onStatusUpdate?: () => void;
}

export const OrderDeliveryManager = ({ order, onStatusUpdate }: OrderDeliveryManagerProps) => {
  const { user } = useAuth();
  const { updateDeliveryStatus } = useOrders();
  const { sendMessage } = useMessages();

  const [deliveryLocation, setDeliveryLocation] = useState(order.deliveryLocation ?? "");
  const [deliveryFee, setDeliveryFee] = useState(order.deliveryFee?.toString() ?? "");
  const [isContacting, setIsContacting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/20";
      case "contacted":      return "bg-blue-500/20 text-blue-600 border-blue-500/20";
      case "driver_assigned":return "bg-purple-500/20 text-purple-600 border-purple-500/20";
      case "delivered":      return "bg-green-500/20 text-green-600 border-green-500/20";
      case "cancelled":      return "bg-red-500/20 text-red-600 border-red-500/20";
      default:               return "bg-gray-500/20 text-gray-600 border-gray-500/20";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":         return "Awaiting Contact";
      case "contacted":       return "Customer Contacted";
      case "driver_assigned": return "Driver Assigned";
      case "delivered":       return "Delivered";
      case "cancelled":       return "Cancelled";
      default:                return status;
    }
  };

  // ── Step 1: Contact customer ──────────────────────────────────────────────
  const handleContactCustomer = async () => {
    if (!user) return;
    setIsContacting(true);
    try {
      const itemNames = order.items.map((i) => i.name).join(", ");
      const contactMessage =
        `Hi ${order.customerName}! Your order (${itemNames}) is confirmed and ready to be dispatched. ` +
        `Please reply with your exact delivery location so we can arrange a driver and calculate the delivery fee. ` +
        `You can also reach us on WhatsApp: 233256221777`;

      // Send via MessageContext — creates a real conversation thread
      await sendMessage(order.customerId, contactMessage);

      // Update order status to "contacted" in Supabase
      await updateDeliveryStatus(order.id, "contacted");

      toast.success("Message sent to customer");
      onStatusUpdate?.();
    } catch {
      toast.error("Failed to contact customer");
    } finally {
      setIsContacting(false);
    }
  };

  // ── Step 2: Confirm delivery details & assign driver ─────────────────────
  const handleConfirmDelivery = async () => {
    if (!deliveryLocation.trim()) {
      toast.error("Please enter the delivery location");
      return;
    }
    const fee = parseFloat(deliveryFee);
    if (!deliveryFee || isNaN(fee) || fee <= 0) {
      toast.error("Please enter a valid delivery fee");
      return;
    }
    if (!user) return;

    setIsAssigning(true);
    try {
      // Update order with location, fee, and new status
      await updateDeliveryStatus(order.id, "driver_assigned", fee, deliveryLocation);

      // Send confirmation message to customer via MessageContext
      const confirmMessage =
        `Great news! Your delivery has been arranged. 🚚\n\n` +
        `📍 Delivering to: ${deliveryLocation}\n` +
        `💵 Delivery Fee: GHS ${fee} (pay directly to driver on arrival)\n\n` +
        `The driver will contact you shortly. Thank you for shopping with SneakersHub!`;

      await sendMessage(order.customerId, confirmMessage);

      toast.success("Delivery arranged and driver assigned");
      onStatusUpdate?.();
    } catch {
      toast.error("Failed to arrange delivery");
    } finally {
      setIsAssigning(false);
    }
  };

  // ── Step 3: Mark as delivered ─────────────────────────────────────────────
  const handleMarkDelivered = async () => {
    try {
      await updateDeliveryStatus(order.id, "delivered");
      toast.success("Order marked as delivered");
      onStatusUpdate?.();
    } catch {
      toast.error("Failed to update delivery status");
    }
  };

  // ── Pickup flow ───────────────────────────────────────────────────────────
  if (order.deliveryMethod === "pickup") {
    return (
      <div className="rounded-xl border border-border p-5 bg-muted/20">
        <div className="flex items-center gap-3 mb-4">
          <Store className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold">Store Pickup Order</h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.deliveryStatus)}`}>
              {getStatusText(order.deliveryStatus)}
            </span>
          </div>

          <div className="p-3 bg-green-500/10 rounded-lg">
            <p className="text-sm text-green-600">Order ready for pickup</p>
            <p className="text-xs text-muted-foreground mt-1">
              Customer can pick up from store at KNUST, Kumasi
            </p>
          </div>

          <Button
            onClick={() => window.open(`tel:${order.customerPhone}`)}
            variant="outline"
            className="w-full"
          >
            <Phone className="w-4 h-4 mr-2" />
            Call Customer
          </Button>
        </div>
      </div>
    );
  }

  // ── Delivery flow ─────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-border p-5 bg-muted/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Truck className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Delivery Coordination</h3>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.deliveryStatus)}`}>
          {getStatusText(order.deliveryStatus)}
        </span>
      </div>

      {/* Customer contact info */}
      <div className="mb-4 p-3 bg-muted/30 rounded-lg">
        <p className="text-sm font-medium">Customer Contact</p>
        <div className="flex items-center gap-2 mt-1">
          <Phone className="w-3 h-3 text-muted-foreground" />
          <a href={`tel:${order.customerPhone}`} className="text-sm text-primary hover:underline">
            {order.customerPhone}
          </a>
        </div>
      </div>

      {/* STEP 1 — Pending: contact the customer */}
      {order.deliveryStatus === "pending" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="p-3 bg-yellow-500/10 rounded-lg">
            <p className="text-sm text-yellow-600">Ready to contact customer</p>
            <p className="text-xs text-muted-foreground mt-1">
              Send a message to get their delivery location and arrange a driver.
            </p>
          </div>

          <Button
            onClick={handleContactCustomer}
            disabled={isContacting}
            className="w-full bg-primary text-white"
          >
            {isContacting
              ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
              : <MessageCircle className="w-4 h-4 mr-2" />}
            Contact Customer
          </Button>
        </motion.div>
      )}

      {/* STEP 2 — Contacted: enter location + fee */}
      {order.deliveryStatus === "contacted" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="p-3 bg-blue-500/10 rounded-lg">
            <p className="text-sm text-blue-600">Customer has been contacted</p>
            <p className="text-xs text-muted-foreground mt-1">
              Once you have their location, enter the details below to assign a driver.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium flex items-center gap-1 mb-1">
              <MapPin className="w-3 h-3" />
              Delivery Location
            </label>
            <input
              type="text"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              placeholder="e.g., East Legon, Accra"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium flex items-center gap-1 mb-1">
              <DollarSign className="w-3 h-3" />
              Delivery Fee (GHS)
            </label>
            <input
              type="number"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              placeholder="e.g., 15"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Customer pays this amount directly to the driver on delivery
            </p>
          </div>

          <Button
            onClick={handleConfirmDelivery}
            disabled={isAssigning}
            className="w-full bg-green-500 text-white hover:bg-green-600"
          >
            {isAssigning
              ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
              : <Truck className="w-4 h-4 mr-2" />}
            Confirm & Assign Driver
          </Button>
        </motion.div>
      )}

      {/* STEP 3 — Driver assigned: awaiting delivery */}
      {order.deliveryStatus === "driver_assigned" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="p-3 bg-purple-500/10 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Driver Assigned</p>
            <div className="mt-2 space-y-1">
              {(order.deliveryLocation || deliveryLocation) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {order.deliveryLocation || deliveryLocation}
                </p>
              )}
              {(order.deliveryFee || deliveryFee) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  GHS {order.deliveryFee || deliveryFee}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => window.open(`tel:${order.customerPhone}`)}
              variant="outline"
              className="flex-1"
            >
              <Phone className="w-4 h-4 mr-2" />
              Call Customer
            </Button>
            <Button
              onClick={handleMarkDelivered}
              className="flex-1 bg-green-500 text-white hover:bg-green-600"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Delivered
            </Button>
          </div>
        </motion.div>
      )}

      {/* STEP 4 — Delivered */}
      {order.deliveryStatus === "delivered" && (
        <div className="p-3 bg-green-500/10 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-sm text-green-600 font-medium">Order Delivered</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Delivery completed. Customer paid GHS {order.deliveryFee} to driver.
          </p>
        </div>
      )}
    </div>
  );
};