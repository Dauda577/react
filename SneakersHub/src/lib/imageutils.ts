/**
 * Returns the raw Supabase Storage URL.
 * Image transforms (/render/image/) require a Supabase Pro plan — using raw URLs instead.
 */
export function optimizeImage(url: string | null | undefined): string {
  if (!url) return "/placeholder.png";
  return url;
}

export const cardImage  = (url: string | null | undefined) => optimizeImage(url);
export const detailImage = (url: string | null | undefined) => optimizeImage(url);
export const thumbImage  = (url: string | null | undefined) => optimizeImage(url);