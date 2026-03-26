// src/types/order.ts
export type DeliveryMethod = 'pickup' | 'delivery';
export type DeliveryStatus = 'pending' | 'contacted' | 'driver_assigned' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface OrderItem {
  id: string;
  listingId: string;
  name: string;
  brand: string;
  size: number;
  price: number;
  image: string;
  sellerId: string;
  sellerName: string;
  sellerVerified: boolean;
  sellerIsOfficial: boolean;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  deliveryMethod: DeliveryMethod;
  deliveryStatus: DeliveryStatus;
  deliveryFee?: number;
  deliveryLocation?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  orderNotes?: string;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  trackingNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderConfirmation {
  order: Order;
  message: string;
}