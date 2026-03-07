import { createContext, useContext, useState, ReactNode } from "react";

type Sneaker = {
  id: number;
  title: string;
  price: string;
  emoji?: string;
};

type SavedContextType = {
  saved: Sneaker[];
  toggleSaved: (item: Sneaker) => void;
  isSaved: (id: number) => boolean;
};

const SavedContext = createContext<SavedContextType | null>(null);

export const SavedProvider = ({ children }: { children: ReactNode }) => {
  const [saved, setSaved] = useState<Sneaker[]>([]);

  const toggleSaved = (item: Sneaker) => {
    setSaved((prev) =>
      prev.find((s) => s.id === item.id)
        ? prev.filter((s) => s.id !== item.id)  // remove
        : [...prev, item]                         // add
    );
  };

  const isSaved = (id: number) => saved.some((s) => s.id === id);

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