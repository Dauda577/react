// src/lib/supabase.ts - Add these enhancements

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: "sneakershub-auth",
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  db: {
    schema: "public",
  },
});

// ── DB warmup ──────────────────────────────────────────────
if (typeof window !== "undefined") {
  supabase.from("listings").select("id").limit(1).then(() => {});
}

// ── NEW: Real-time helper functions ───────────────────────

/**
 * Subscribe to real-time changes on a table
 */
export const subscribeToTable = (
  table: string,
  callback: (payload: any) => void,
  filter?: { column: string; value: any }
) => {
  let query = supabase
    .channel(`public:${table}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
        filter: filter ? `${filter.column}=eq.${filter.value}` : undefined
      },
      (payload) => {
        console.log(`Realtime ${table} update:`, payload);
        callback(payload);
      }
    )
    .subscribe();

  return query;
};

/**
 * Subscribe to broadcast events (typing, presence, etc.)
 */
export const subscribeToEvents = (
  channel: string,
  events: { [key: string]: (data: any) => void }
) => {
  const subscription = supabase
    .channel(channel)
    .on('broadcast', { event: '*' }, (payload) => {
      const handler = events[payload.event];
      if (handler) handler(payload.payload);
    })
    .subscribe();

  return subscription;
};

/**
 * Track user presence (online/offline)
 */
export const trackPresence = async (userId: string) => {
  const channel = supabase.channel('online_users', {
    config: {
      presence: {
        key: userId,
      },
    },
  });

  await channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
      });
    }
  });

  return channel;
};

/**
 * Unsubscribe from all channels (cleanup)
 */
export const cleanupSubscriptions = (subscriptions: any[]) => {
  subscriptions.forEach(sub => {
    supabase.removeChannel(sub);
  });
};

// ── Typed helpers ──────────────────────────────────────────
export type Profile = {
  id: string;
  name: string;
  role: "buyer" | "seller";
  phone: string | null;
  city: string | null;
  region: string | null;
  verified: boolean;
  created_at: string;
};

export type ListingRow = {
  id: string;
  seller_id: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  sizes: number[];
  description: string | null;
  image_url: string | null;
  status: "active" | "sold";
  boosted: boolean;
  boost_expires_at: string | null;
  views: number;
  created_at: string;
};

export type OrderRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  status: "pending" | "shipped" | "delivered";
  seller_confirmed: boolean;
  buyer_confirmed: boolean;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_method: string | null;
  delivery_label: string | null;
  delivery_estimated_cost: string | null;
  delivery_days: string | null;
  buyer_first_name: string;
  buyer_last_name: string;
  buyer_phone: string;
  buyer_address: string;
  buyer_city: string;
  buyer_region: string;
  seen_by_seller: boolean;
  placed_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  listing_id: string | null;
  name: string;
  brand: string | null;
  image_url: string | null;
  price: number;
  size: number | null;
  quantity: number;
};

export type ReviewRow = {
  id: string;
  order_id: string;
  seller_id: string;
  buyer_id: string;
  buyer_name: string;
  stars: number;
  comment: string | null;
  created_at: string;
};

// ── NEW: Add Message type for real-time chat ──────────────
export type MessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  listing_id?: string;
  content: string;
  read: boolean;
  created_at: string;
};

// ── NEW: Add Bid type for real-time bidding ───────────────
export type BidRow = {
  id: string;
  listing_id: string;
  user_id: string;
  amount: number;
  status: 'active' | 'outbid' | 'won' | 'lost';
  created_at: string;
};