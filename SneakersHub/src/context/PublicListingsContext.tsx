import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
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

// In-memory cache so navigating back to shop is instant
let listingsCache: PublicListing[] | null = null;

export const PublicListingsProvider = ({ children }: { children: ReactNode }) => {
  const [listings, setListings] = useState<PublicListing[]>(listingsCache ?? []);
  const [loading, setLoading] = useState(listingsCache === null);
  const isFetching = useRef(false);

  const fetchListings = async () => {
    // Prevent duplicate simultaneous fetches
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(listingsCache === null);

    // Fetch listings and profiles in parallel
    const [listingsRes, profilesRes] = await Promise.all([
      supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("boosted", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, name, phone, city, region, verified, created_at"),
    ]);

    if (!listingsRes.error && listingsRes.data) {
      // Build a quick profile lookup map
      const profileMap: Record<string, any> = {};
      (profilesRes.data ?? []).forEach((p) => { profileMap[p.id] = p; });

      const mapped: PublicListing[] = listingsRes.data.map((row: any) => {
        const profile = profileMap[row.seller_id];
        return {
          id: row.id,
          sellerId: row.seller_id,
          sellerName: profile?.name ?? "Seller",
          sellerPhone: profile?.phone ?? null,
          sellerCity: profile?.city ?? null,
          sellerRegion: profile?.region ?? null,
          sellerVerified: profile?.verified ?? false,
          sellerMemberSince: profile?.created_at
            ? new Date(profile.created_at).getFullYear().toString()
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

  // Realtime: update only the changed listing instead of refetching everything
  useEffect(() => {
    const channel = supabase
      .channel("listings-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "listings" },
        () => fetchListings() // New listing — refetch to get seller info
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "listings" },
        (payload) => {
          // Just update the changed listing in state — no full refetch
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
      .on(
        "postgres_changes",
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