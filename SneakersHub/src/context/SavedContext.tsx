import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Matches the shape coming from PublicListingsContext
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
  toggleSaved: (item: SavedSneaker) => void;
  isSaved: (id: string) => boolean;
};

const SavedContext = createContext<SavedContextType | null>(null);

const STORAGE_KEY = "sneakershub-saved";

const loadFromStorage = (): SavedSneaker[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const SavedProvider = ({ children }: { children: ReactNode }) => {
  const [saved, setSaved] = useState<SavedSneaker[]>(loadFromStorage);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {}
  }, [saved]);

  const toggleSaved = (item: SavedSneaker) => {
    setSaved((prev) =>
      prev.find((s) => s.id === item.id)
        ? prev.filter((s) => s.id !== item.id)
        : [...prev, item]
    );
  };

  const isSaved = (id: string) => saved.some((s) => s.id === id);

  return (
    <SavedContext.Provider value={{ saved, toggleSaved, isSaved }}>
      {children}
    </SavedContext.Provider>
  );
};

export const useSaved = () => {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error("useSaved must be used inside SavedProvider");
  return ctx;
};