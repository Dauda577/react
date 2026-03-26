import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Send, Phone, MessageCircle, Truck, CheckCircle, 
  XCircle, Loader2, MapPin, DollarSign, Clock 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface OrderDeliveryManagerProps {
  order: {
    id: string;
    customerName: string;
    customerPhone: string;
    customerLocation?: string;
    deliveryMethod: "pickup" | "delivery";
    deliveryStatus: string;
    deliveryFee?: number;
    deliveryLocation?: string;
    items: any[];
  };
  onStatusUpdate?: () => void;
}

export const OrderDeliveryManager = ({ order, onStatusUpdate }: OrderDeliveryManagerProps) => {
  const [deliveryLocation, setDeliveryLocation] = useState(order.deliveryLocation || "");
  const [deliveryFee, setDeliveryFee] = useState(order.deliveryFee?.toString() || "");
  const [isContacting, setIsContacting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [message, setMessage] = useState("");

  const handleContactCustomer = async () => {
    setIsContacting(true);
    
    try {
      // Simulate sending message - replace with actual API call
      const defaultMessage = `Hi ${order.customerName}! Your order #${order.id.slice(0, 8)} is ready for delivery coordination. 
      
Please reply with your exact delivery location so we can calculate the delivery fee. 
      
You can also reach us on WhatsApp: 233256221777`;
      
      setMessage(defaultMessage);
      
      // Here you would send an actual message via your messaging system
      // await sendMessage(order.id, defaultMessage);
      
      toast.success("Message sent to customer");
      
      // Update order status
      // await updateOrderStatus(order.id, "contacted");
      
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsContacting(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryLocation) {
      toast.error("Please enter delivery location");
      return;
    }
    if (!deliveryFee || parseFloat(deliveryFee) <= 0) {
      toast.error("Please enter a valid delivery fee");
      return;
    }

    setIsAssigning(true);

    try {
      // Here you would update the order in your database
      // await updateOrder(order.id, {
      //   deliveryLocation,
      //   deliveryFee: parseFloat(deliveryFee),
      //   deliveryStatus: "driver_assigned"
      // });

      // Send confirmation to customer
      const confirmationMessage = `Great news! Your delivery has been arranged. 
      
📍 Delivery Fee: GHS ${deliveryFee}
🚚 Driver will contact you soon.
💵 Please pay the delivery fee directly to the driver upon arrival.`;

      // await sendMessage(order.id, confirmationMessage);

      toast.success("Delivery arranged and driver assigned");
      
      if (onStatusUpdate) {
        onStatusUpdate();
      }
      
    } catch (error) {
      toast.error("Failed to arrange delivery");
    } finally {
      setIsAssigning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/20";
      case "contacted":
        return "bg-blue-500/20 text-blue-600 border-blue-500/20";
      case "driver_assigned":
        return "bg-purple-500/20 text-purple-600 border-purple-500/20";
      case "delivered":
        return "bg-green-500/20 text-green-600 border-green-500/20";
      case "cancelled":
        return "bg-red-500/20 text-red-600 border-red-500/20";
      default:
        return "bg-gray-500/20 text-gray-600 border-gray-500/20";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Awaiting Contact";
      case "contacted":
        return "Customer Contacted";
      case "driver_assigned":
        return "Driver Assigned";
      case "delivered":
        return "Delivered";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

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
              Customer can pick up from store at East Legon, Accra
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

      {/* Customer Contact Info */}
      <div className="mb-4 p-3 bg-muted/30 rounded-lg">
        <p className="text-sm font-medium">Customer Contact</p>
        <div className="flex items-center gap-2 mt-1">
          <Phone className="w-3 h-3 text-muted-foreground" />
          <a href={`tel:${order.customerPhone}`} className="text-sm text-primary hover:underline">
            {order.customerPhone}
          </a>
        </div>
      </div>

      {/* Pending Status - Contact Customer */}
      {order.deliveryStatus === "pending" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div className="p-3 bg-yellow-500/10 rounded-lg">
            <p className="text-sm text-yellow-600">Ready to contact customer</p>
            <p className="text-xs text-muted-foreground mt-1">
              Send a message to get their delivery location and arrange delivery.
            </p>
          </div>
          
          <Button
            onClick={handleContactCustomer}
            disabled={isContacting}
            className="w-full bg-primary text-white"
          >
            {isContacting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <MessageCircle className="w-4 h-4 mr-2" />
            )}
            Contact Customer
          </Button>
        </motion.div>
      )}

      {/* Contacted Status - Set Delivery Details */}
      {order.deliveryStatus === "contacted" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
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
              Customer pays this amount directly to driver on delivery
            </p>
          </div>
          
          <Button
            onClick={handleConfirmDelivery}
            disabled={isAssigning}
            className="w-full bg-green-500 text-white hover:bg-green-600"
          >
            {isAssigning ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Truck className="w-4 h-4 mr-2" />
            )}
            Confirm & Assign Driver
          </Button>
        </motion.div>
      )}

      {/* Driver Assigned Status */}
      {order.deliveryStatus === "driver_assigned" && (
        <div className="space-y-3">
          <div className="p-3 bg-purple-500/10 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Delivery Arranged</p>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {order.deliveryLocation || deliveryLocation}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> GHS {order.deliveryFee || deliveryFee}
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => window.open(`tel:${order.customerPhone}`)}
            variant="outline"
            className="w-full"
          >
            <Phone className="w-4 h-4 mr-2" />
            Call Customer to Confirm
          </Button>
        </div>
      )}

      {/* Delivered Status */}
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

      {/* Message Preview (if sent) */}
      {message && (
        <div className="mt-3 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-1">Message Sent:</p>
          <p className="text-xs text-foreground whitespace-pre-wrap">{message}</p>
        </div>
      )}
    </div>
  );
};