import { StoreProviders } from "@/components/Providers";
import Index from "@/views/Index";
import { getAllListings } from "@/lib/server/listings";

export const revalidate = 60;

export default async function HomePage() {
  const initialListings = await getAllListings();
  return (
    <StoreProviders initialListings={initialListings}>
      <Index />
    </StoreProviders>
  );
}