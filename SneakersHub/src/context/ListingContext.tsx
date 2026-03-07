import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, ListingRow } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export type Listing = {
  id: string;
  sellerId: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  sizes: number[];
  description: string;
  image: string | null;
  status: "active" | "sold";
  views: number;
  boosted: boolean;
  boostExpiresAt: string | null;
  createdAt: string;
};

type ListingContextType = {
  listings: Listing[];
  boostedListings: Listing[];
  loading: boolean;
  addListing: (listing: Omit<Listing, "id" | "sellerId" | "views" | "createdAt" | "status" | "boosted" | "boostExpiresAt">, imageFile?: File) => Promise<void>;
  updateListing: (id: string, data: Partial<Listing>, imageFile?: File) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  markSold: (id: string) => Promise<void>;
  boostListing: (id: string) => Promise<void>;
  fetchListings: () => Promise<void>;
};

export const BOOST_FEE = 5;
export const BOOST_DURATION = 7;

const ListingContext = createContext<ListingContextType | null>(null);

const rowToListing = (r: ListingRow): Listing => ({
  id: r.id,
  sellerId: r.seller_id,
  name: r.name,
  brand: r.brand,
  price: r.price,
  category: r.category,
  sizes: r.sizes,
  description: r.description ?? "",
  image: r.image_url,
  status: r.status,
  views: r.views,
  boosted: r.boosted,
  boostExpiresAt: r.boost_expires_at,
  createdAt: r.created_at,
});

export const isBoostActive = (listing: Listing): boolean => {
  if (!listing.boosted || !listing.boostExpiresAt) return false;
  return new Date(listing.boostExpiresAt) > new Date();
};

export const boostDaysLeft = (listing: Listing): number => {
  if (!listing.boostExpiresAt) return 0;
  const diff = new Date(listing.boostExpiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const uploadImage = async (file: File, listingId: string): Promise<string | null> => {
  const ext = file.name.split(".").pop();
  const path = `${listingId}.${ext}`;
  const { error } = await supabase.storage.from("listings").upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from("listings").getPublicUrl(path);
  return data.publicUrl;
};

export const ListingProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = async () => {
    if (!user) { setListings([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setListings((data as ListingRow[]).map(rowToListing));
    setLoading(false);
  };

  useEffect(() => { fetchListings(); }, [user?.id]);

  // Real-time: refetch seller's own listings when they change
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("seller-listings-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "listings",
        filter: `seller_id=eq.${user.id}`,
      }, () => {
        fetchListings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const boostedListings = listings.filter((l) => l.status === "active" && isBoostActive(l));

  const addListing = async (
    listing: Omit<Listing, "id" | "sellerId" | "views" | "createdAt" | "status" | "boosted" | "boostExpiresAt">,
    imageFile?: File
  ) => {
    if (!user) throw new Error("Not authenticated");
    // Insert first to get the id
    const { data, error } = await supabase.from("listings").insert({
      seller_id: user.id,
      name: listing.name,
      brand: listing.brand,
      price: listing.price,
      category: listing.category,
      sizes: listing.sizes,
      description: listing.description,
    }).select().single();
    if (error) throw new Error(error.message);

    let imageUrl: string | null = null;
    if (imageFile && data) {
      imageUrl = await uploadImage(imageFile, data.id);
      if (imageUrl) {
        await supabase.from("listings").update({ image_url: imageUrl }).eq("id", data.id);
      }
    }
    await fetchListings();
  };

  const updateListing = async (id: string, updates: Partial<Listing>, imageFile?: File) => {
    const dbUpdates: Partial<ListingRow> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.sizes !== undefined) dbUpdates.sizes = updates.sizes;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.boosted !== undefined) dbUpdates.boosted = updates.boosted;
    if (updates.boostExpiresAt !== undefined) dbUpdates.boost_expires_at = updates.boostExpiresAt;

    if (imageFile) {
      const imageUrl = await uploadImage(imageFile, id);
      if (imageUrl) dbUpdates.image_url = imageUrl;
    } else if (updates.image !== undefined) {
      dbUpdates.image_url = updates.image;
    }

    const { error } = await supabase.from("listings").update(dbUpdates).eq("id", id);
    if (error) throw new Error(error.message);
    await fetchListings();
  };

  const deleteListing = async (id: string) => {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) throw new Error(error.message);
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  const markSold = async (id: string) => {
    await updateListing(id, { status: "sold" });
  };

  const boostListing = async (id: string) => {
    const expiresAt = new Date(Date.now() + BOOST_DURATION * 24 * 60 * 60 * 1000).toISOString();
    await updateListing(id, { boosted: true, boostExpiresAt: expiresAt });
  };

  return (
    <ListingContext.Provider value={{
      listings, boostedListings, loading,
      addListing, updateListing, deleteListing, markSold, boostListing, fetchListings,
    }}>
      {children}
    </ListingContext.Provider>
  );
};

export const useListings = () => {
  const ctx = useContext(ListingContext);
  if (!ctx) throw new Error("useListings must be used inside ListingProvider");
  return ctx;
};