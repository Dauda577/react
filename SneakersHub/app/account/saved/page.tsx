"use client";

import AccountSaved from "@/components/Account/AccountSaved";
import { useSaved } from "@/context/SavedContext";

export default function AccountSavedPage() {
  const { saved, toggleSaved } = useSaved();
  return <AccountSaved saved={saved} toggleSaved={toggleSaved} />;
}