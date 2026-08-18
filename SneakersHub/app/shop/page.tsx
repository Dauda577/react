import { Suspense } from "react";
import { StoreProviders } from "@/components/Providers";
import Shop from "@/views/Shop";
import { getAllListings } from "@/lib/server/listings";

export const revalidate = 60;

export default async function ShopPage() {
  const initialListings = await getAllListings();
  return (
    <StoreProviders initialListings={initialListings}>
      <Suspense>
        <Shop />
      </Suspense>
    </StoreProviders>
  );
}