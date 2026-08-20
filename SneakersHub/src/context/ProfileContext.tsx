"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "@/lib/router";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type ProfileForm = { name: string; phone: string; city: string; region: string; bio: string };

interface ProfileContextValue {
  profileLoaded: boolean;
  editMode: boolean;
  setEditMode: (v: boolean | ((prev: boolean) => boolean)) => void;
  avatarUrl: string | null;
  isVerified: boolean;
  isOfficial: boolean;
  totalListingsCreated: number;
  profileForm: ProfileForm;
  setProfileForm: (fn: (p: ProfileForm) => ProfileForm) => void;
  handleSaveProfile: () => void;
  handleLogout: () => void;
  handleDeleteAccount: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, isGuest, logout } = useAuth();
  const navigate = useNavigate();

  const [profileLoaded, setProfileLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isOfficial, setIsOfficial] = useState(false);
  const [totalListingsCreated, setTotalListingsCreated] = useState(0);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: user?.name ?? "Guest",
    phone: "",
    city: "",
    region: "",
    bio: "",
  });

  useEffect(() => {
    if (!user?.id) return;
    const CACHE_KEY = `profile_cache_${user.id}`;

    const applyProfileData = (p: any) => {
      setIsVerified(p.verified ?? false);
      setIsOfficial(p.is_official ?? false);
      setProfileForm((prev) => ({
        ...prev,
        name: p.name ?? prev.name,
        phone: p.phone ?? "",
        city: p.city ?? "",
        region: p.region ?? "",
      }));
      if (p.avatar_url) setAvatarUrl(p.avatar_url);
      setTotalListingsCreated(p.listing_count ?? 0);
    };

    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        applyProfileData(JSON.parse(cached));
        setProfileLoaded(true);
      }
    } catch {
      /* sessionStorage unavailable */
    }

    supabase
      .from("profiles")
      .select("name, phone, city, region, verified, is_official, listing_count, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch {
          /* ignore */
        }
        applyProfileData(data);

        if (!data.avatar_url) {
          supabase.auth.getUser().then(({ data: authData }) => {
            const metaPhoto =
              authData?.user?.user_metadata?.avatar_url ??
              authData?.user?.user_metadata?.picture ??
              null;
            if (metaPhoto) setAvatarUrl(metaPhoto);
          });
        }

        setProfileLoaded(true);
      });
  }, [user?.id]);

  const handleSaveProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: profileForm.name,
          phone: profileForm.phone || null,
          city: profileForm.city || null,
          region: profileForm.region || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      try {
        sessionStorage.removeItem(`profile_cache_${user.id}`);
      } catch {
        /* ignore */
      }
      setEditMode(false);
      toast.success("Profile updated!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save profile");
    }
  }, [user, profileForm]);

  const handleLogout = useCallback(async () => {
    if (user?.id) {
      try {
        sessionStorage.removeItem(`profile_cache_${user.id}`);
      } catch {
        /* ignore */
      }
    }
    await logout();
    navigate("/");
  }, [logout, navigate, user?.id]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { user_id: user.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || !data?.success) {
        toast.error("Failed to delete account. Please contact support.");
        return;
      }
      try {
        sessionStorage.removeItem(`profile_cache_${user.id}`);
      } catch {
        /* ignore */
      }
      await supabase.auth.signOut();
      toast.success("Account deleted.");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete account");
    }
  }, [user?.id, navigate]);

  const value: ProfileContextValue = {
    profileLoaded,
    editMode,
    setEditMode,
    avatarUrl,
    isVerified,
    isOfficial,
    totalListingsCreated,
    profileForm,
    setProfileForm,
    handleSaveProfile,
    handleLogout,
    handleDeleteAccount,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}