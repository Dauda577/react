import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type SavedSneaker = {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string | null;
  category: string;
  sizes: number[];
  description: string;
  sellerVerified: boolean;
  sellerIsOfficial: boolean;
  isBoosted: boolean;
};

type SavedContextType = {
  saved: SavedSneaker[];
  toggleSaved: (item: SavedSneaker) => Promise<void>;
  isSaved: (id: string) => boolean;
  loading: boolean;
};

const SavedContext = createContext<SavedContextType | null>(null);

const GUEST_KEY = "sneakershub-saved-guest";

const getGuestSaved = (): SavedSneaker[] => {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const setGuestSaved = (items: SavedSneaker[]) => {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(items)); } catch {}
};

export const SavedProvider = ({ children }: { children: ReactNode }) => {
  const { user, isGuest } = useAuth();
  const [saved, setSaved] = useState<SavedSneaker[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Fetch saved listings from Supabase for logged-in users ──────────────
  const fetchSaved = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_listings")
      .select(`
        listing_id,
        listings (
          id, name, brand, price, image_url, category,
          sizes, description, boosted,
          profiles ( verified, is_official )
        )
      `)
      .eq("user_id", user.id);

    if (!error && data) {
      const items: SavedSneaker[] = data
        .map((row: any) => {
          const l = row.listings;
          if (!l) return null;
          const p = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
          return {
            id: l.id,
            name: l.name,
            brand: l.brand,
            price: l.price,
            image: l.image_url,
            category: l.category,
            sizes: l.sizes,
            description: l.description ?? "",
            sellerVerified: p?.verified ?? false,
            sellerIsOfficial: p?.is_official ?? false,
            isBoosted: l.boosted ?? false,
          };
        })
        .filter(Boolean) as SavedSneaker[];
      setSaved(items);
    }
    setLoading(false);
  }, [user?.id]);

  // ── Load on auth change ─────────────────────────────────────────────────
  useEffect(() => {
    if (user?.id) {
      fetchSaved();
    } else if (isGuest) {
      // Guests use localStorage
      setSaved(getGuestSaved());
    } else {
      // Logged out — clear
      setSaved([]);
    }
  }, [user?.id, isGuest, fetchSaved]);

  // ── Toggle: Supabase for users, localStorage for guests ────────────────
  const toggleSaved = useCallback(async (item: SavedSneaker) => {
    const alreadySaved = saved.some((s) => s.id === item.id);

    if (user?.id) {
      // Optimistic update
      setSaved((prev) =>
        alreadySaved ? prev.filter((s) => s.id !== item.id) : [...prev, item]
      );

      if (alreadySaved) {
        await supabase
          .from("saved_listings")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", item.id);
      } else {
        const { error } = await supabase
          .from("saved_listings")
          .insert({ user_id: user.id, listing_id: item.id });

        // If insert failed (e.g. listing deleted), revert
        if (error) {
          setSaved((prev) => prev.filter((s) => s.id !== item.id));
        }
      }
    } else {
      // Guest — localStorage only
      setSaved((prev) => {
        const updated = alreadySaved
          ? prev.filter((s) => s.id !== item.id)
          : [...prev, item];
        setGuestSaved(updated);
        return updated;
      });
    }
  }, [user?.id, saved]);

  const isSaved = useCallback((id: string) => saved.some((s) => s.id === id), [saved]);

  return (
    <SavedContext.Provider value={{ saved, toggleSaved, isSaved, loading }}>
      {children}
    </SavedContext.Provider>
  );
};

export const useSaved = () => {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error("useSaved must be used inside SavedProvider");
  return ctx;
};