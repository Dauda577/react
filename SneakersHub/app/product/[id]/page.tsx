import { StoreProviders } from "@/components/Providers";
import ProductDetail from "@/views/ProductDetail";
import { getAllListings } from "@/lib/server/listings";

export const revalidate = 60;

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  await params;
  const initialListings = await getAllListings();
  return (
    <StoreProviders initialListings={initialListings}>
      <ProductDetail />
    </StoreProviders>
  );
}