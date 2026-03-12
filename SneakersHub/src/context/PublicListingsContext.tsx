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
  sellerIsOfficial: boolean;
  sellerSubaccountCode: string | null;
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

let listingsCache: PublicListing[] | null = null;
// Expose cache reset globally so verification flow can force a refresh
if (typeof window !== "undefined") {
  Object.defineProperty(window, "__listingsCache", {
    set: (v) => { listingsCache = v; },
    get: () => listingsCache,
    configurable: true,
  });
}

export const PublicListingsProvider = ({ children }: { children: ReactNode }) => {
  const [listings, setListings] = useState<PublicListing[]>(listingsCache ?? []);
  const [loading, setLoading] = useState(listingsCache === null);
  const isFetching = useRef(false);

  const fetchListings = async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(listingsCache === null);

    const { data, error } = await supabase
      .from("listings")
      .select(`
        id, seller_id, name, brand, price, category, sizes,
        description, image_url, boosted, boost_expires_at,
        views, created_at, city, region,
        profiles (
          name, phone, verified, is_official, subaccount_code, created_at
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
          city: row.city ?? null,
          region: row.region ?? null,
          sellerVerified: p?.verified ?? false,
          sellerIsOfficial: p?.is_official ?? false,
          sellerSubaccountCode: p?.subaccount_code ?? null,
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

      // Filter out expired boosts client-side and sort:
      // 1. Active boosts first, newest boost_expires_at first (most recently boosted)
      // 2. Then unboosted, newest created_at first
      const now = Date.now();
      const isActiveBoost = (l: PublicListing) => {
        if (!l.boosted) return false;
        if (!l.boostExpiresAt) return true; // official — no expiry
        return new Date(l.boostExpiresAt).getTime() > now;
      };

      const sorted = [...mapped].sort((a, b) => {
        const aActive = isActiveBoost(a) ? 1 : 0;
        const bActive = isActiveBoost(b) ? 1 : 0;
        if (bActive !== aActive) return bActive - aActive;
        // Both boosted — newest boost expiry first (most recently boosted)
        if (aActive && bActive) {
          const aExp = a.boostExpiresAt ? new Date(a.boostExpiresAt).getTime() : Infinity;
          const bExp = b.boostExpiresAt ? new Date(b.boostExpiresAt).getTime() : Infinity;
          return bExp - aExp;
        }
        // Both unboosted — newest listing first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setListings(sorted);
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

  useEffect(() => {
    const channel = supabase
      .channel("listings-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "listings" },
        () => fetchListings()
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "listings" },
        (payload) => {
          setListings((prev) => {
            const updated = prev.map((l) =>
              l.id === payload.new.id
                ? { ...l, boosted: payload.new.boosted, boostExpiresAt: payload.new.boost_expires_at, views: payload.new.views, price: payload.new.price, name: payload.new.name }
                : l
            );
            listingsCache = updated;
            return updated;
          });
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "listings" },
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