import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export type PublicListing = {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string | null;
  sellerWhatsapp: string | null;
  sellerCity: string | null;
  sellerRegion: string | null;
  sellerVerified: boolean;
  sellerIsOfficial: boolean;
  sellerMemberSince: string;
  images: string[];
  city: string | null;
  region: string | null;
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
  condition: string | null;
  negotiable: boolean;
  deliveryAvailable: boolean;
  whatsapp: string | null;
  phone: string | null;
};

type PublicListingsContextType = {
  listings: PublicListing[];
  loading: boolean;
  fetchListings: () => Promise<void>;
  incrementViews: (id: string) => Promise<void>;
  refreshListing: (id: string) => Promise<void>;
};

const PublicListingsContext = createContext<PublicListingsContextType | null>(null);

let listingsCache: PublicListing[] | null = null;

if (typeof window !== "undefined") {
  Object.defineProperty(window, "__listingsCache", {
    set: (v) => { listingsCache = v; },
    get: () => listingsCache,
    configurable: true,
  });
}

const SELECT_QUERY = `
  id, seller_id, name, brand, price, category, sizes,
  description, image_url, images, boosted, boost_expires_at,
  views, created_at, city, region, condition, negotiable, delivery_available, whatsapp, phone,
  profiles ( name, phone, city, region, verified, is_official, created_at )
`;

const mapRow = (row: any): PublicListing => {
  const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    sellerId: row.seller_id,
    sellerName: p?.name ?? "Seller",
    sellerPhone: p?.phone ?? null,
    sellerWhatsapp: row.whatsapp ?? null,
    sellerCity: p?.city ?? null,
    sellerRegion: p?.region ?? null,
    city: row.city ?? null,
    region: row.region ?? null,
    sellerVerified: p?.verified ?? false,
    sellerIsOfficial: p?.is_official ?? false,
    sellerMemberSince: p?.created_at
      ? new Date(p.created_at).getFullYear().toString()
      : new Date(row.created_at).getFullYear().toString(),
    images: row.images ?? [],
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
    condition: row.condition ?? null,
    negotiable: row.negotiable ?? false,
    deliveryAvailable: row.delivery_available ?? false,
    whatsapp: row.whatsapp ?? null,
    phone: row.phone ?? null,
  };
};

const sortListings = (listings: PublicListing[]): PublicListing[] => {
  const now = Date.now();
  const isActiveBoost = (l: PublicListing) => {
    if (!l.boosted) return false;
    if (!l.boostExpiresAt) return true;
    return new Date(l.boostExpiresAt).getTime() > now;
  };
  return [...listings].sort((a, b) => {
    const aActive = isActiveBoost(a) ? 1 : 0;
    const bActive = isActiveBoost(b) ? 1 : 0;
    if (bActive !== aActive) return bActive - aActive;
    if (aActive && bActive) {
      const aExp = a.boostExpiresAt ? new Date(a.boostExpiresAt).getTime() : Infinity;
      const bExp = b.boostExpiresAt ? new Date(b.boostExpiresAt).getTime() : Infinity;
      return bExp - aExp;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

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
      .select(SELECT_QUERY)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const mapped = data.map(mapRow);
      const sorted = sortListings(mapped);
      listingsCache = sorted;
      setListings(sorted);
    }

    setLoading(false);
    isFetching.current = false;
  };

  const refreshListing = async (id: string) => {
    const { data, error } = await supabase
      .from("listings")
      .select(SELECT_QUERY)
      .eq("id", id)
      .single();

    if (!error && data) {
      const refreshed = mapRow(data);
      setListings((prev) => {
        const updated = prev.map((l) => l.id === id ? refreshed : l);
        listingsCache = updated;
        return updated;
      });
    }
  };

  const incrementViews = async (id: string) => {
    await supabase.rpc("increment_listing_views", { listing_id: id });
  };

  useEffect(() => { if (!listingsCache) fetchListings(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel("listings-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "listings" },
        async (payload) => {
          const { data, error } = await supabase.from("listings").select(SELECT_QUERY).eq("id", payload.new.id).single();
          if (!error && data) {
            setListings((prev) => {
              const updated = [mapRow(data), ...prev];
              listingsCache = updated;
              return updated;
            });
          }
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "listings" },
        async (payload) => {
          const { data, error } = await supabase.from("listings").select(SELECT_QUERY).eq("id", payload.new.id).single();
          if (!error && data) {
            setListings((prev) => {
              const updated = prev.map((l) => l.id === payload.new.id ? mapRow(data) : l);
              listingsCache = updated;
              return updated;
            });
          }
        })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "listings" },
        (payload) => {
          setListings((prev) => {
            const updated = prev.filter((l) => l.id !== payload.old.id);
            listingsCache = updated;
            return updated;
          });
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <PublicListingsContext.Provider value={{ listings, loading, fetchListings, incrementViews, refreshListing }}>
      {children}
    </PublicListingsContext.Provider>
  );
};

export const usePublicListings = () => {
  const ctx = useContext(PublicListingsContext);
  if (!ctx) throw new Error("usePublicListings must be used inside PublicListingsProvider");
  return ctx;
};