/**
 * Returns an optimized Supabase Storage image URL.
 * Uses the render/image transform API for compression and resizing.
 * Falls back to the original URL if it's not a Supabase storage URL.
 */
export function optimizeImage(url: string | null | undefined, width = 400, quality = 75): string {
  if (!url) return "/placeholder.png";

  // Only transform Supabase storage URLs
  if (!url.includes("/storage/v1/object/public/")) return url;

  // Convert object URL to render URL
  const optimized = url
    .replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");

  return `${optimized}?width=${width}&quality=${quality}&resize=cover`;
}

/** For listing cards — 400px wide, good quality */
export const cardImage = (url: string | null | undefined) => optimizeImage(url, 400, 75);

/** For product detail — full size */
export const detailImage = (url: string | null | undefined) => optimizeImage(url, 800, 85);

/** For thumbnails — small */
export const thumbImage = (url: string | null | undefined) => optimizeImage(url, 200, 70);