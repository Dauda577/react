/**
 * Image utility functions for thumbnail generation and optimization
 * Used throughout the SneakersHub application for image optimization
 */

/**
 * Generates a card image URL for sneaker cards
 * Optimized for display in card components (300x300)
 * @param imageUrl - The original image URL
 * @returns Optimized card image URL
 */
export const cardImage = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect fill='%23f0f0f0' width='200' height='200'/%3E%3Ctext x='50%' y='50%' text-anchor='middle' dy='.3em' fill='%23999' font-size='14' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";
  }

  if (imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  if (imageUrl.includes("supabase.co")) {
    try {
      const url = new URL(imageUrl);
      url.searchParams.set("width", "300");
      url.searchParams.set("height", "300");
      url.searchParams.set("resize", "contain");
      url.searchParams.set("quality", "80");
      return url.toString();
    } catch {
      return imageUrl;
    }
  }

  if (imageUrl.includes("unsplash.com")) {
    try {
      const url = new URL(imageUrl);
      url.searchParams.set("w", "300");
      url.searchParams.set("h", "300");
      url.searchParams.set("fit", "crop");
      url.searchParams.set("q", "80");
      return url.toString();
    } catch {
      return imageUrl;
    }
  }

  return imageUrl;
};

/**
 * Generates a detail page image URL for product detail pages
 * Optimized for large display (800x800)
 * @param imageUrl - The original image URL
 * @returns Optimized detail image URL
 */
export const detailImage = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect fill='%23f0f0f0' width='400' height='400'/%3E%3Ctext x='50%' y='50%' text-anchor='middle' dy='.3em' fill='%23999' font-size='20' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";
  }

  if (imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  if (imageUrl.includes("supabase.co")) {
    try {
      const url = new URL(imageUrl);
      url.searchParams.set("width", "800");
      url.searchParams.set("height", "800");
      url.searchParams.set("resize", "contain");
      url.searchParams.set("quality", "85");
      return url.toString();
    } catch {
      return imageUrl;
    }
  }

  if (imageUrl.includes("unsplash.com")) {
    try {
      const url = new URL(imageUrl);
      url.searchParams.set("w", "800");
      url.searchParams.set("h", "800");
      url.searchParams.set("fit", "crop");
      url.searchParams.set("q", "85");
      return url.toString();
    } catch {
      return imageUrl;
    }
  }

  return imageUrl;
};

/**
 * Generates a thumbnail URL from an image URL
 * Optimized for small thumbnail displays (150x150)
 * @param imageUrl - The original image URL
 * @param width - Desired thumbnail width (default: 150)
 * @param height - Desired thumbnail height (default: 150)
 * @returns Optimized thumbnail URL or original URL if optimization not possible
 */
export const thumbImage = (
  imageUrl: string | null | undefined,
  width: number = 150,
  height: number = 150
): string => {
  if (!imageUrl) {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3C/svg%3E";
  }

  if (imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  if (imageUrl.includes("supabase.co")) {
    try {
      const url = new URL(imageUrl);
      url.searchParams.set("width", String(width));
      url.searchParams.set("height", String(height));
      url.searchParams.set("resize", "contain");
      return url.toString();
    } catch {
      return imageUrl;
    }
  }

  if (imageUrl.includes("unsplash.com")) {
    try {
      const url = new URL(imageUrl);
      url.searchParams.set("w", String(width));
      url.searchParams.set("h", String(height));
      url.searchParams.set("fit", "crop");
      return url.toString();
    } catch {
      return imageUrl;
    }
  }

  if (imageUrl.includes("cloudinary.com")) {
    return imageUrl;
  }

  return imageUrl;
};

/**
 * Optimizes an image URL for display
 * @param imageUrl - The original image URL
 * @param maxWidth - Maximum width (default: 800)
 * @returns Optimized image URL
 */
export const optimizeImage = (
  imageUrl: string | null | undefined,
  maxWidth: number = 800
): string => {
  if (!imageUrl) return "";

  if (imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  if (imageUrl.includes("supabase.co")) {
    try {
      const url = new URL(imageUrl);
      url.searchParams.set("width", String(maxWidth));
      url.searchParams.set("quality", "80");
      return url.toString();
    } catch {
      return imageUrl;
    }
  }

  if (imageUrl.includes("unsplash.com")) {
    try {
      const url = new URL(imageUrl);
      url.searchParams.set("w", String(maxWidth));
      url.searchParams.set("q", "80");
      return url.toString();
    } catch {
      return imageUrl;
    }
  }

  return imageUrl;
};

/**
 * Gets a placeholder image while the real image is loading
 * @returns Base64 encoded placeholder SVG
 */
export const getPlaceholderImage = (): string => {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Crect fill='%23e5e5e5' width='300' height='300'/%3E%3Ctext x='50%' y='50%' text-anchor='middle' dy='.3em' fill='%23999' font-size='24' font-family='sans-serif'%3ELoading...%3C/text%3E%3C/svg%3E";
};

/**
 * Checks if an image URL is valid
 * @param url - The image URL to check
 * @returns true if URL is valid, false otherwise
 */
export const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  if (url.startsWith("data:")) return true;

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Gets image dimensions if available from URL parameters
 * @param imageUrl - The image URL
 * @returns Object with width and height, or null if not available
 */
export const getImageDimensions = (
  imageUrl: string | null | undefined
): { width: number; height: number } | null => {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const width = url.searchParams.get("width");
    const height = url.searchParams.get("height");
    const w = url.searchParams.get("w");
    const h = url.searchParams.get("h");

    if (width && height) {
      return { width: parseInt(width), height: parseInt(height) };
    }
    if (w && h) {
      return { width: parseInt(w), height: parseInt(h) };
    }
  } catch {
    return null;
  }

  return null;
};

/**
 * Converts an image to WebP format URL (if service supports it)
 * @param imageUrl - The original image URL
 * @returns URL with WebP format if supported, otherwise original URL
 */
export const toWebP = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return "";

  if (imageUrl.includes("supabase.co")) {
    try {
      const url = new URL(imageUrl);
      url.searchParams.set("format", "webp");
      return url.toString();
    } catch {
      return imageUrl;
    }
  }

  if (imageUrl.includes("unsplash.com")) {
    try {
      const url = new URL(imageUrl);
      url.searchParams.set("fm", "webp");
      return url.toString();
    } catch {
      return imageUrl;
    }
  }

  return imageUrl;
};