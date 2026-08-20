"use client";

import AccountAnalytics from "@/components/Account/AccountAnalytics";
import { GuestAuthBanner } from "@/components/Account/AccountShell";
import { useAuth } from "@/context/AuthContext";

export default function AccountAnalyticsPage() {
  const { isGuest } = useAuth();
  return isGuest ? <GuestAuthBanner action="view analytics" /> : <AccountAnalytics />;
}