import sneaker1 from "@/assets/sneaker-1.png";
import sneaker2 from "@/assets/sneaker-2.png";
import sneaker3 from "@/assets/sneaker-3.png";
import sneaker4 from "@/assets/sneaker-4.png";
import sneaker5 from "@/assets/sneaker-5.png";
import sneaker6 from "@/assets/sneaker-6.png";

export interface Sneaker {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  category: string;
  isNew?: boolean;
  isFeatured?: boolean;
  sizes: number[];
  description: string;
}

export const sneakers: Sneaker[] = [
  {
    id: "1",
    name: "Shadow Runner X",
    brand: "STRIDE",
    price: 189,
    image: sneaker1,
    category: "Running",
    isNew: true,
    isFeatured: true,
    sizes: [7, 8, 9, 10, 11, 12],
    description: "Engineered for speed with responsive cushioning and a breathable upper that adapts to your stride.",
  },
  {
    id: "2",
    name: "Cloud Drift Pro",
    brand: "AERO",
    price: 165,
    image: sneaker2,
    category: "Running",
    isNew: true,
    sizes: [7, 8, 9, 10, 11],
    description: "Ultra-lightweight construction meets cloud-like comfort. Perfect for long-distance runs.",
  },
  {
    id: "3",
    name: "Classic Court",
    brand: "LEGACY",
    price: 135,
    image: sneaker3,
    category: "Lifestyle",
    isFeatured: true,
    sizes: [6, 7, 8, 9, 10, 11, 12],
    description: "Timeless design refined for modern comfort. Premium leather upper with cushioned insole.",
  },
  {
    id: "4",
    name: "Terra Explorer",
    brand: "NOMAD",
    price: 210,
    image: sneaker4,
    category: "Outdoor",
    isNew: true,
    sizes: [8, 9, 10, 11, 12],
    description: "Built for the trail with reinforced toe cap and all-terrain grip. Adventure-ready.",
  },
  {
    id: "5",
    name: "Blaze High",
    brand: "STRIDE",
    price: 225,
    image: sneaker5,
    category: "Basketball",
    isFeatured: true,
    sizes: [8, 9, 10, 11, 12, 13],
    description: "Dominate the court with explosive cushioning and ankle-locking support.",
  },
  {
    id: "6",
    name: "Heritage Low",
    brand: "LEGACY",
    price: 120,
    image: sneaker6,
    category: "Lifestyle",
    sizes: [6, 7, 8, 9, 10, 11],
    description: "Clean lines and understated style. A wardrobe essential built to last.",
  },
];

export const categories = ["All", "Running", "Lifestyle", "Basketball", "Outdoor"];