import { AppProviders } from "@/components/Providers";
import AccountShell from "@/components/Account/AccountShell";

export const dynamic = "force-dynamic";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <AccountShell>{children}</AccountShell>
    </AppProviders>
  );
}