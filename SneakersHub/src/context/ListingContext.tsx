import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase, ListingRow } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { triggerSMS } from "@/lib/sms";

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
  city: string | null;
  region: string | null;
  shippingCost: number;
  handlingTime: string;
  images: string[];
};

type ListingContextType = {
  listings: Listing[];
  boostedListings: Listing[];
  loading: boolean;
  addListing: (listing: Omit<Listing, "id" | "sellerId" | "views" | "createdAt" | "status" | "boosted" | "boostExpiresAt">, imageFile?: File, extraImages?: File[]) => Promise<void>;
  updateListing: (id: string, data: Partial<Listing>, imageFile?: File, extraImages?: File[]) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  markSold: (id: string) => Promise<void>;
  boostListing: (id: string) => Promise<void>;
  fetchListings: () => Promise<void>;
};

export const BOOST_FEE = 5;
export const BOOST_DURATION = 10;

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
  city: (r as any).city ?? null,
  region: (r as any).region ?? null,
});

export const isBoostActive = (listing: Listing): boolean => {
  if (!listing.boosted) return false;
  // Official listings: boosted=true with no expiry — always active
  if (!listing.boostExpiresAt) return true;
  return new Date(listing.boostExpiresAt) > new Date();
};

export const boostDaysLeft = (listing: Listing): number => {
  // No expiry = official listing, always featured
  if (!listing.boostExpiresAt) return 0;
  const diff = new Date(listing.boostExpiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

/**
 * Compresses and resizes an image to WebP before uploading.
 * - Max 1200px wide (preserves aspect ratio)
 * - 85% quality WebP
 * - Typically reduces a 4MB photo to ~200-400KB with no visible quality loss
 */
const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_WIDTH = 900;
      let { width, height } = img;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not available")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
        "image/webp",
        0.75 // 75% quality — good balance of size vs quality
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
};

const uploadImage = async (file: File, listingId: string): Promise<string | null> => {
  try {
    // Compress to WebP before uploading
    const compressed = await compressImage(file);
    const path = `${listingId}.webp`;
    const { error } = await supabase.storage.from("listings").upload(path, compressed, {
      upsert: true,
      contentType: "image/webp",
    });
    if (error) throw error;
    const { data } = supabase.storage.from("listings").getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn("Image compression failed, uploading original:", err);
    // Fallback — upload original if compression fails
    const ext = file.name.split(".").pop();
    const path = `${listingId}.${ext}`;
    const { error } = await supabase.storage.from("listings").upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("listings").getPublicUrl(path);
    return data.publicUrl;
  }
};

export const ListingProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = useCallback(async () => {
    if (!user) { setListings([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select("id, seller_id, name, brand, price, category, sizes, description, image_url, images, status, boosted, boost_expires_at, views, created_at, city, region, shipping_cost, handling_time")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setListings((data as ListingRow[]).map(rowToListing));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchListings(); }, [user?.id]);

  // ── Realtime: in-place updates ────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`seller-listings-realtime:${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "listings",
        filter: `seller_id=eq.${user.id}`,
      }, (payload) => {
        const newListing = rowToListing(payload.new as ListingRow);
        setListings((prev) => {
          if (prev.some((l) => l.id === newListing.id)) return prev;
          return [newListing, ...prev];
        });
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "listings",
        filter: `seller_id=eq.${user.id}`,
      }, (payload) => {
        const updated = rowToListing(payload.new as ListingRow);
        setListings((prev) =>
          prev.map((l) => (l.id === updated.id ? updated : l))
        );
      })
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "listings",
        filter: `seller_id=eq.${user.id}`,
      }, (payload) => {
        setListings((prev) => prev.filter((l) => l.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const boostedListings = listings.filter((l) => l.status === "active" && isBoostActive(l));

  const addListing = async (
    listing: Omit<Listing, "id" | "sellerId" | "views" | "createdAt" | "status" | "boosted" | "boostExpiresAt">,
    imageFile?: File,
    extraImages?: File[]
  ) => {
    if (!user) throw new Error("Not authenticated");

    // ── Listing limit: unverified sellers max 2, verified unlimited ──
    const UNVERIFIED_MAX = 20;
    const { data: profile } = await supabase
      .from("profiles")
      .select("verified, is_official")
      .eq("id", user.id)
      .single();

    const isVerified = profile?.verified === true || profile?.is_official === true;

    if (!isVerified) {
      // Use listing_count on profiles — a counter that only ever increments,
      // never decrements on delete, so sellers can't bypass limit by deleting
      const { data: countData } = await supabase
        .from("profiles")
        .select("listing_count")
        .eq("id", user.id)
        .single();

      const totalCreated = countData?.listing_count ?? 0;

      if (totalCreated >= UNVERIFIED_MAX) {
        throw new Error(
          `Unverified sellers can create up to ${UNVERIFIED_MAX} listings. Get verified to list unlimited sneakers.`
        );
      }
    }

    // Fetch seller's default city/region from profile
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("city, region")
      .eq("id", user.id)
      .single();

    // Increment the permanent listing counter on the profile (never decremented)
    await supabase.rpc("increment_listing_count", { seller_id: user.id });

    const { data, error } = await supabase.from("listings").insert({
      seller_id: user.id,
      name: listing.name,
      brand: listing.brand,
      price: listing.price,
      category: listing.category,
      sizes: listing.sizes,
      description: listing.description,
      city: listing.city ?? sellerProfile?.city ?? null,
      region: listing.region ?? sellerProfile?.region ?? null,
      shipping_cost: (listing as any).shippingCost ?? 0,
      handling_time: (listing as any).handlingTime ?? "Ships in 1-3 days",
    }).select().single();

    if (error) throw new Error(error.message);

    // SMS confirmation to seller (fire and forget)
    triggerSMS({ type: "listing.created", record: data }).catch(() => {});

    // Upload images in background — don't block navigation
    if (imageFile && data) {
      const allFiles = [imageFile, ...(extraImages ?? [])];
      Promise.all(allFiles.map((f, i) => uploadImage(f, `${data.id}-${i}`))).then((urls) => {
        const validUrls = urls.filter(Boolean) as string[];
        const coverUrl = validUrls[0] ?? null;
        supabase.from("listings").update({
          image_url: coverUrl,
          images: validUrls,
        }).eq("id", data.id);
        setListings((prev) =>
          prev.map((l) => l.id === data.id ? { ...l, image: coverUrl, images: validUrls } : l)
        );
      }).catch(() => {});
    }
  };

  const updateListing = async (id: string, updates: Partial<Listing>, imageFile?: File, extraImages?: File[]) => {
    const dbUpdates: any = {};
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.region !== undefined) dbUpdates.region = updates.region;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.sizes !== undefined) dbUpdates.sizes = updates.sizes;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if ((updates as any).shippingCost !== undefined) dbUpdates.shipping_cost = (updates as any).shippingCost;
    if ((updates as any).handlingTime !== undefined) dbUpdates.handling_time = (updates as any).handlingTime;
    if (updates.boosted !== undefined) dbUpdates.boosted = updates.boosted;
    if (updates.boostExpiresAt !== undefined) dbUpdates.boost_expires_at = updates.boostExpiresAt;

    if (imageFile) {
      const allFiles = [imageFile, ...(extraImages ?? [])];
      const urls = await Promise.all(allFiles.map((f, i) => uploadImage(f, `${id}-${i}`)));
      const validUrls = urls.filter(Boolean) as string[];
      if (validUrls[0]) { dbUpdates.image_url = validUrls[0]; dbUpdates.images = validUrls; }
    } else if (updates.image !== undefined) {
      dbUpdates.image_url = updates.image;
    }

    // Optimistic update
    setListings((prev) =>
      prev.map((l) => l.id === id ? { ...l, ...updates } : l)
    );

    const { error } = await supabase.from("listings").update(dbUpdates).eq("id", id);
    if (error) {
      // Revert on failure
      await fetchListings();
      throw new Error(error.message);
    }
  };

  const deleteListing = async (id: string) => {
    // Optimistic removal
    setListings((prev) => prev.filter((l) => l.id !== id));
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) {
      await fetchListings();
      throw new Error(error.message);
    }
  };

  const markSold = (id: string) => updateListing(id, { status: "sold" });

  const boostListing = (id: string) => {
    const expiresAt = new Date(Date.now() + BOOST_DURATION * 24 * 60 * 60 * 1000).toISOString();
    return updateListing(id, { boosted: true, boostExpiresAt: expiresAt });
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