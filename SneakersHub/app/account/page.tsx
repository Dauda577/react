import { AppProviders } from "@/components/Providers";
import Account from "@/views/Account";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <AppProviders>
      <Account />
    </AppProviders>
  );
}