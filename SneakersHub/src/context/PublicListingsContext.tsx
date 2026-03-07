import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, ListingRow } from "@/lib/supabase";

export type PublicListing = {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string | null;
  sellerCity: string | null;
  sellerRegion: string | null;
  sellerVerified: boolean;
  sellerMemberSince: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  sizes: number[];
  description: string;
  image: string | null;
  boosted: boolean;
  boostExpiresAt: string | null;
  views: number;
  createdAt: string;
};

type PublicListingsContextType = {
  listings: PublicListing[];
  loading: boolean;
  fetchListings: () => Promise<void>;
  incrementViews: (id: string) => Promise<void>;
};

const PublicListingsContext = createContext<PublicListingsContextType | null>(null);

export const PublicListingsProvider = ({ children }: { children: ReactNode }) => {
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select(`
        *,
        profiles (
          id,
          name,
          phone,
          city,
          region,
          verified,
          created_at
        )
      `)
      .eq("status", "active")
      .order("boosted", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) {
      setListings(data.map((row: any) => ({
        id: row.id,
        sellerId: row.seller_id,
        sellerName: row.profiles?.name ?? "Seller",
        sellerPhone: row.profiles?.phone ?? null,
        sellerCity: row.profiles?.city ?? null,
        sellerRegion: row.profiles?.region ?? null,
        sellerVerified: row.profiles?.verified ?? false,
        sellerMemberSince: row.profiles?.created_at
          ? new Date(row.profiles.created_at).getFullYear().toString()
          : new Date(row.created_at).getFullYear().toString(),
        name: row.name,
        brand: row.brand,
        price: row.price,
        category: row.category,
        sizes: row.sizes,
        description: row.description ?? "",
        image: row.image_url,
        boosted: row.boosted,
        boostExpiresAt: row.boost_expires_at,
        views: row.views,
        createdAt: row.created_at,
      })));
    }
    setLoading(false);
  };

  const incrementViews = async (id: string) => {
    await supabase.rpc("increment_listing_views", { listing_id: id });
  };

  useEffect(() => { fetchListings(); }, []);

  // Real-time: refetch when any listing changes
  useEffect(() => {
    const channel = supabase
      .channel("listings-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "listings",
      }, () => {
        fetchListings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <PublicListingsContext.Provider value={{ listings, loading, fetchListings, incrementViews }}>
      {children}
    </PublicListingsContext.Provider>
  );
};

export const usePublicListings = () => {
  const ctx = useContext(PublicListingsContext);
  if (!ctx) throw new Error("usePublicListings must be used inside PublicListingsProvider");
  return ctx;
};