export const PRODUCT_CATEGORIES = [
  { label: "Sneakers",     emoji: "👟" },
  { label: "Phones",       emoji: "📱" },
  { label: "Clothes",      emoji: "👕" },
  { label: "Electronics",  emoji: "💻" },
  { label: "Watches",      emoji: "⌚" },
  { label: "Bags",         emoji: "👜" },
  { label: "Furniture",    emoji: "🪑" },
  { label: "Accessories",  emoji: "🕶️" },
  { label: "Tops",         emoji: "👔" },
  { label: "Bottoms",      emoji: "👖" },
  { label: "Outerwear",    emoji: "🧥" },
  { label: "Activewear",   emoji: "🩳" },
  { label: "Jewellery",    emoji: "💍" },
  { label: "Other",        emoji: "📦" },
];

export const CATEGORY_SVGS: Record<string, string> = Object.fromEntries(
  PRODUCT_CATEGORIES.map((c) => [c.label, `/categoryicons/${c.label.toLowerCase()}.svg`])
);