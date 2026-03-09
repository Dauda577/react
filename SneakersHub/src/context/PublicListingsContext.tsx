import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

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

// In-memory cache — navigating back to shop is instant
let listingsCache: PublicListing[] | null = null;

export const PublicListingsProvider = ({ children }: { children: ReactNode }) => {
  const [listings, setListings] = useState<PublicListing[]>(listingsCache ?? []);
  const [loading, setLoading] = useState(listingsCache === null);
  const isFetching = useRef(false);

  const fetchListings = async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(listingsCache === null);

    // Single query — Supabase joins profiles server-side, no extra round-trip
    const { data, error } = await supabase
      .from("listings")
      .select(`
        id, seller_id, name, brand, price, category, sizes,
        description, image_url, boosted, boost_expires_at,
        views, created_at,
        profiles (
          name, phone, city, region, verified, created_at
        )
      `)
      .eq("status", "active")
      .order("boosted", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) {
      const mapped: PublicListing[] = data.map((row: any) => {
        const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.id,
          sellerId: row.seller_id,
          sellerName: p?.name ?? "Seller",
          sellerPhone: p?.phone ?? null,
          sellerCity: p?.city ?? null,
          sellerRegion: p?.region ?? null,
          sellerVerified: p?.verified ?? false,
          sellerMemberSince: p?.created_at
            ? new Date(p.created_at).getFullYear().toString()
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
        };
      });

      listingsCache = mapped;
      setListings(mapped);
    }

    setLoading(false);
    isFetching.current = false;
  };

  const incrementViews = async (id: string) => {
    await supabase.rpc("increment_listing_views", { listing_id: id });
  };

  useEffect(() => {
    if (!listingsCache) fetchListings();
  }, []);

  // Realtime — update only the changed listing, no full refetch
  useEffect(() => {
    const channel = supabase
      .channel("listings-realtime")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "listings" },
        () => fetchListings()
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "listings" },
        (payload) => {
          setListings((prev) => {
            const updated = prev.map((l) =>
              l.id === payload.new.id
                ? {
                    ...l,
                    boosted: payload.new.boosted,
                    boostExpiresAt: payload.new.boost_expires_at,
                    views: payload.new.views,
                    price: payload.new.price,
                    name: payload.new.name,
                  }
                : l
            );
            listingsCache = updated;
            return updated;
          });
        }
      )
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "listings" },
        (payload) => {
          setListings((prev) => {
            const updated = prev.filter((l) => l.id !== payload.old.id);
            listingsCache = updated;
            return updated;
          });
        }
      )
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