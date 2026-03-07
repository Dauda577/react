import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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

  const fetchReviews = async (sellerId: string) => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });
    if (!error && data) setReviews((data as ReviewRow[]).map(rowToReview));
  };

  const addReview = async (review: Omit<Review, "id" | "createdAt">) => {
    const { data, error } = await supabase.from("reviews").insert({
      order_id: review.orderId,
      seller_id: review.sellerId,
      buyer_id: review.buyerId,
      buyer_name: review.buyerName,
      stars: review.stars,
      comment: review.comment,
    }).select().single();
    if (error) throw new Error(error.message);
    setReviews((prev) => [rowToReview(data as ReviewRow), ...prev]);
  };

  const getSellerStats = (sellerId: string) => {
    const sellerReviews = reviews.filter((r) => r.sellerId === sellerId);
    if (sellerReviews.length === 0) return { average: 0, count: 0 };
    const average = sellerReviews.reduce((sum, r) => sum + r.stars, 0) / sellerReviews.length;
    return { average: Math.round(average * 10) / 10, count: sellerReviews.length };
  };

  const hasReviewed = (orderId: string) => reviews.some((r) => r.orderId === orderId);

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