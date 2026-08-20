"use client";

import AccountSettings from "@/components/Account/AccountSettings";
import { GuestAuthBanner } from "@/components/Account/AccountShell";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";

export default function AccountSettingsPage() {
  const { user, isGuest } = useAuth();
  const { handleDeleteAccount } = useProfile();

  if (isGuest) return <GuestAuthBanner action="access settings" />;
  return <AccountSettings user={user} onDeleteAccount={handleDeleteAccount} />;
}