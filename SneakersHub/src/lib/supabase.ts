import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: "sneakershub-auth",
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

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