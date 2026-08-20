"use client";

import AccountProfile from "@/components/Account/AccountProfile";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";

export default function AccountProfilePage() {
  const { user, isGuest } = useAuth();
  const {
    isVerified,
    isOfficial,
    editMode,
    setEditMode,
    profileForm,
    setProfileForm,
    avatarUrl,
    handleSaveProfile,
    handleLogout,
  } = useProfile();

  return (
    <AccountProfile
      user={user}
      isGuest={isGuest}
      role={user?.role ?? "buyer"}
      verificationLoading={false}
      isVerified={isVerified}
      isOfficial={isOfficial}
      editMode={editMode}
      setEditMode={setEditMode}
      profileForm={profileForm}
      setProfileForm={setProfileForm}
      avatarUrl={avatarUrl}
      onSaveProfile={handleSaveProfile}
      onLogout={handleLogout}
    />
  );
}