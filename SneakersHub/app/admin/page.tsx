import { AppProviders } from "@/components/Providers";
import Admin from "@/views/Admin";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <AppProviders>
      <Admin />
    </AppProviders>
  );
}