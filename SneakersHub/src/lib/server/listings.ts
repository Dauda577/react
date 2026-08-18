import { createServerSupabase } from "@/lib/server/supabase";
import { fetchPublicListings, PublicListing } from "@/lib/listings";

export const getAllListings = async (): Promise<PublicListing[]> => {
  const supabase = createServerSupabase();
  return fetchPublicListings(supabase);
};