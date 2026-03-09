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
  // ── NEW: Live bid info ───────────────────────────────────
  currentBid?: number;
  bidCount?: number;
  endTime?: string;
  watchers?: number;
};

// ── NEW: Bid interface ────────────────────────────────────
export type Bid = {
  id: string;
  listing_id: string;
  user_id: string;
  user_name: string;
  amount: number;
  created_at: string;
};

type PublicListingsContextType = {
  listings: PublicListing[];
  loading: boolean;
  fetchListings: () => Promise<void>;
  incrementViews: (id: string) => Promise<void>;
  // ── NEW: Live bidding ────────────────────────────────────
  placeBid: (listingId: string, amount: number) => Promise<boolean>;
  getBidsForListing: (listingId: string) => Bid[];
  watchListing: (listingId: string) => void;
  unwatchListing: (listingId: string) => void;
  // ── NEW: Live filters/search ─────────────────────────────
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  filteredListings: PublicListing[];
  // ── NEW: Sorting options ─────────────────────────────────
  sortBy: 'newest' | 'price_low' | 'price_high' | 'most_viewed';
  setSortBy: (sort: 'newest' | 'price_low' | 'price_high' | 'most_viewed') => void;
};

const PublicListingsContext = createContext<PublicListingsContextType | null>(null);

// In-memory cache — navigating back to shop is instant
let listingsCache: PublicListing[] | null = null;

// ── NEW: Bids cache ───────────────────────────────────────
let bidsCache: Record<string, Bid[]> = {};

export const PublicListingsProvider = ({ children }: { children: ReactNode }) => {
  const [listings, setListings] = useState<PublicListing[]>(listingsCache ?? []);
  const [loading, setLoading] = useState(listingsCache === null);
  const [bids, setBids] = useState<Record<string, Bid[]>>(bidsCache);
  const [watchedListings, setWatchedListings] = useState<Set<string>>(new Set());
  const isFetching = useRef(false);

  // ── NEW: Filtering state ─────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high' | 'most_viewed'>('newest');

  const fetchListings = async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(listingsCache === null);

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
          currentBid: row.current_bid || row.price, // If bids table exists
          bidCount: row.bid_count || 0,
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

  // ── NEW: Live bidding functions ──────────────────────────
  const placeBid = async (listingId: string, amount: number): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if bid is higher than current
    const currentBid = bids[listingId]?.[0]?.amount || 
                      listings.find(l => l.id === listingId)?.price || 0;
    
    if (amount <= currentBid) return false;

    const { error } = await supabase
      .from('bids')
      .insert({
        listing_id: listingId,
        user_id: user.id,
        amount: amount,
      });

    if (error) {
      console.error('Failed to place bid:', error);
      return false;
    }

    return true;
  };

  const getBidsForListing = (listingId: string): Bid[] => {
    return bids[listingId] || [];
  };

  const watchListing = (listingId: string) => {
    setWatchedListings(prev => new Set([...prev, listingId]));
  };

  const unwatchListing = (listingId: string) => {
    setWatchedListings(prev => {
      const newSet = new Set(prev);
      newSet.delete(listingId);
      return newSet;
    });
  };

  // ── NEW: Computed filtered listings ──────────────────────
  const filteredListings = listings
    .filter(listing => {
      // Category filter
      if (selectedCategory !== 'all' && listing.category !== selectedCategory) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          listing.name.toLowerCase().includes(query) ||
          listing.brand.toLowerCase().includes(query) ||
          listing.description.toLowerCase().includes(query)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_low':
          return (a.currentBid || a.price) - (b.currentBid || b.price);
        case 'price_high':
          return (b.currentBid || b.price) - (a.currentBid || a.price);
        case 'most_viewed':
          return b.views - a.views;
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // ── ENHANCED: Realtime with bids and live watchers ───────
  useEffect(() => {
    // ── Listings channel (your existing code) ──────────────
    const listingsChannel = supabase
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

    // ── NEW: Bids channel ──────────────────────────────────
    const bidsChannel = supabase
      .channel("bids-realtime")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "bids" },
        async (payload) => {
          const newBid = payload.new as Bid;
          
          // Fetch bidder's name
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', newBid.user_id)
            .single();
          
          const bidWithName = {
            ...newBid,
            user_name: profile?.name || 'Anonymous'
          };

          // Update bids cache
          setBids(prev => {
            const listingBids = [bidWithName, ...(prev[newBid.listing_id] || [])]
              .sort((a, b) => b.amount - a.amount);
            
            bidsCache = {
              ...bidsCache,
              [newBid.listing_id]: listingBids
            };
            
            return bidsCache;
          });

          // Update listing with current bid
          setListings(prev => {
            const updated = prev.map(l => 
              l.id === newBid.listing_id 
                ? { 
                    ...l, 
                    currentBid: newBid.amount,
                    bidCount: (l.bidCount || 0) + 1 
                  }
                : l
            );
            listingsCache = updated;
            return updated;
          });

          // Notify watchers
          if (watchedListings.has(newBid.listing_id)) {
            playBidNotification();
          }
        }
      )
      .subscribe();

    // ── NEW: Live watchers count via broadcast ─────────────
    const watchersChannel = supabase
      .channel("listing-watchers")
      .on('broadcast', { event: 'watch' }, ({ payload }) => {
        // Update watcher count for listing
        setListings(prev => {
          const updated = prev.map(l => 
            l.id === payload.listingId
              ? { ...l, watchers: payload.count }
              : l
          );
          return updated;
        });
      })
      .subscribe();

    // Broadcast that user is watching a listing
    const broadcastWatch = (listingId: string, action: 'join' | 'leave') => {
      watchersChannel.send({
        type: 'broadcast',
        event: 'watch',
        payload: { listingId, action }
      });
    };

    return () => { 
      supabase.removeChannel(listingsChannel);
      supabase.removeChannel(bidsChannel);
      supabase.removeChannel(watchersChannel);
    };
  }, [watchedListings]);

  // ── NEW: Play sound for new bids ─────────────────────────
  const playBidNotification = () => {
    const audio = new Audio('/sounds/bid.mp3');
    audio.play().catch(() => {});
  };

  // ── NEW: Load initial bids ───────────────────────────────
  useEffect(() => {
    const fetchInitialBids = async () => {
      const { data } = await supabase
        .from('bids')
        .select(`
          *,
          profiles:user_id (name)
        `)
        .in('listing_id', listings.map(l => l.id))
        .order('amount', { ascending: false });

      if (data) {
        const bidsMap: Record<string, Bid[]> = {};
        data.forEach((bid: any) => {
          if (!bidsMap[bid.listing_id]) bidsMap[bid.listing_id] = [];
          bidsMap[bid.listing_id].push({
            ...bid,
            user_name: bid.profiles?.name || 'Anonymous'
          });
        });
        setBids(bidsMap);
        bidsCache = bidsMap;
      }
    };

    if (listings.length > 0) {
      fetchInitialBids();
    }
  }, [listings]);

  useEffect(() => {
    if (!listingsCache) fetchListings();
  }, []);

  return (
    <PublicListingsContext.Provider 
      value={{ 
        listings, 
        loading, 
        fetchListings, 
        incrementViews,
        // ── NEW exports ────────────────────────────────────
        placeBid,
        getBidsForListing,
        watchListing,
        unwatchListing,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        filteredListings,
        sortBy,
        setSortBy,
      }}
    >
      {children}
    </PublicListingsContext.Provider>
  );
};

export const usePublicListings = () => {
  const ctx = useContext(PublicListingsContext);
  if (!ctx) throw new Error("usePublicListings must be used inside PublicListingsProvider");
  return ctx;
};