import { Suspense } from "react";
import { AppProviders } from "@/components/Providers";
import ResetPassword from "@/views/ResetPassword";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <AppProviders>
      <Suspense>
        <ResetPassword />
      </Suspense>
    </AppProviders>
  );
}