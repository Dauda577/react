import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase, ReviewRow } from "@/lib/supabase";

export type Review = {
  id: string;
  orderId: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  stars: number;
  comment: string;
  createdAt: string;
};

type RatingContextType = {
  reviews: Review[];
  addReview: (review: Omit<Review, "id" | "createdAt">) => Promise<void>;
  getSellerStats: (sellerId: string) => { average: number; count: number };
  hasReviewed: (orderId: string) => boolean;
  fetchReviews: (sellerId: string) => Promise<void>;
};

const RatingContext = createContext<RatingContextType | null>(null);

const rowToReview = (r: ReviewRow): Review => ({
  id: r.id,
  orderId: r.order_id,
  sellerId: r.seller_id,
  buyerId: r.buyer_id,
  buyerName: r.buyer_name,
  stars: r.stars,
  comment: r.comment ?? "",
  createdAt: r.created_at,
});

export const RatingProvider = ({ children }: { children: ReactNode }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [watchedSellerIds, setWatchedSellerIds] = useState<Set<string>>(new Set());

  const fetchReviews = useCallback(async (sellerId: string) => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const fetched = (data as ReviewRow[]).map(rowToReview);
      setReviews((prev) => {
        // Merge: replace existing reviews for this seller, keep others
        const others = prev.filter((r) => r.sellerId !== sellerId);
        return [...fetched, ...others];
      });
      // Track this seller for realtime
      setWatchedSellerIds((prev) => new Set([...prev, sellerId]));
    }
  }, []);

  const addReview = async (review: Omit<Review, "id" | "createdAt">) => {
    // Optimistic
    const optimistic: Review = {
      ...review,
      id: `optimistic-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setReviews((prev) => [optimistic, ...prev]);

    const { data, error } = await supabase.from("reviews").insert({
      order_id: review.orderId,
      seller_id: review.sellerId,
      buyer_id: review.buyerId,
      buyer_name: review.buyerName,
      stars: review.stars,
      comment: review.comment,
    }).select().single();

    if (error) {
      // Revert optimistic
      setReviews((prev) => prev.filter((r) => r.id !== optimistic.id));
      throw new Error(error.message);
    }

    // Replace optimistic with real
    setReviews((prev) =>
      prev.map((r) => r.id === optimistic.id ? rowToReview(data as ReviewRow) : r)
    );
  };

  // ── Realtime: listen for new reviews on watched sellers ───────────────────
  useEffect(() => {
    if (watchedSellerIds.size === 0) return;

    const channel = supabase
      .channel(`reviews-realtime`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "reviews",
      }, (payload) => {
        const newReview = rowToReview(payload.new as ReviewRow);
        // Only add if it's for a seller we've loaded
        if (!watchedSellerIds.has(newReview.sellerId)) return;
        setReviews((prev) => {
          if (prev.some((r) => r.id === newReview.id)) return prev;
          return [newReview, ...prev];
        });
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "reviews",
      }, (payload) => {
        const updated = rowToReview(payload.new as ReviewRow);
        setReviews((prev) =>
          prev.map((r) => r.id === updated.id ? updated : r)
        );
      })
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "reviews",
      }, (payload) => {
        setReviews((prev) => prev.filter((r) => r.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [watchedSellerIds.size]);

  const getSellerStats = useCallback((sellerId: string) => {
    const sellerReviews = reviews.filter((r) => r.sellerId === sellerId);
    if (sellerReviews.length === 0) return { average: 0, count: 0 };
    const average = sellerReviews.reduce((sum, r) => sum + r.stars, 0) / sellerReviews.length;
    return { average: Math.round(average * 10) / 10, count: sellerReviews.length };
  }, [reviews]);

  const hasReviewed = useCallback((orderId: string) =>
    reviews.some((r) => r.orderId === orderId), [reviews]);

  return (
    <RatingContext.Provider value={{ reviews, addReview, getSellerStats, hasReviewed, fetchReviews }}>
      {children}
    </RatingContext.Provider>
  );
};

export const useRatings = () => {
  const ctx = useContext(RatingContext);
  if (!ctx) throw new Error("useRatings must be used inside RatingProvider");
  return ctx;
};