import { AppProviders } from "@/components/Providers";
import CreateListing from "@/views/CreateListing";

export const dynamic = "force-dynamic";

export default function NewListingPage() {
  return (
    <AppProviders>
      <CreateListing />
    </AppProviders>
  );
}