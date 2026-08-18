import { AppProviders } from "@/components/Providers";
import NotFoundView from "@/views/NotFound";

export default function NotFound() {
  return (
    <AppProviders>
      <NotFoundView />
    </AppProviders>
  );
}