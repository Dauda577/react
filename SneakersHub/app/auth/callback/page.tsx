import { Suspense } from "react";
import { AppProviders } from "@/components/Providers";
import AuthCallback from "@/views/AuthCallback";

export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  return (
    <AppProviders>
      <Suspense>
        <AuthCallback />
      </Suspense>
    </AppProviders>
  );
}