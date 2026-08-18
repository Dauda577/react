import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import {
  PublicListing,
  SELECT_QUERY,
  mapRow,
  sortListings,
  fetchPublicListings,
} from "@/lib/listings";

export type { PublicListing };

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

export const PublicListingsProvider = ({ children, initialListings }: {
  children: ReactNode;
  initialListings?: PublicListing[];
}) => {
  const [listings, setListings] = useState<PublicListing[]>(listingsCache ?? []);
  const [loading, setLoading] = useState(listingsCache === null);
  const isFetching = useRef(false);

  const fetchListings = async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(listingsCache === null);

    try {
      const sorted = await fetchPublicListings(supabase);
      listingsCache = sorted;
      setListings(sorted);
    } catch {
      // keep whatever is currently shown
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

  useEffect(() => {
    if (initialListings) {
      listingsCache = initialListings;
      setListings(initialListings);
      setLoading(false);
    }
  }, [initialListings]);

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