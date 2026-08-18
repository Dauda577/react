import { Suspense } from "react";
import { StoreProviders } from "@/components/Providers";
import SearchPage from "@/views/SearchPage";
import { getAllListings } from "@/lib/server/listings";

export const revalidate = 60;

export default async function SearchRoute() {
  const initialListings = await getAllListings();
  return (
    <StoreProviders initialListings={initialListings}>
      <Suspense>
        <SearchPage />
      </Suspense>
    </StoreProviders>
  );
}