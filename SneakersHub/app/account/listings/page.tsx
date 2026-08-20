"use client";

import { useEffect, useState } from "react";
import AccountListings from "@/components/Account/AccountListings";
import { useListings, type Listing } from "@/context/ListingContext";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { toast } from "sonner";

const FIRST_LISTING_BANNER_KEY = "classifieds-first-listing-dismissed";

export default function AccountListingsPage() {
  const { user, isGuest } = useAuth();
  const { listings, boostListing } = useListings();
  const { isVerified, isOfficial, totalListingsCreated } = useProfile();

  const [boostingListing, setBoostingListing] = useState<Listing | null>(null);
  const [showFirstListingBanner, setShowFirstListingBanner] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const boostListingId = params.get("boost_success");
    if (!boostListingId || !user?.id) return;
    window.history.replaceState({}, "", window.location.pathname);
    boostListing(boostListingId)
      .then(() => toast.success("🎉 Listing boosted! Featured for 10 days."))
      .catch(() => toast.error("Payment received but boost failed. Contact support."));
  }, [user?.id, boostListing]);

  useEffect(() => {
    if (isGuest) return;
    const dismissed = localStorage.getItem(FIRST_LISTING_BANNER_KEY);
    if (!dismissed && listings.length === 0) setShowFirstListingBanner(true);
  }, [isGuest, listings.length]);

  return (
    <AccountListings
      listings={listings}
      isVerified={isVerified}
      isOfficial={isOfficial}
      totalListingsCreated={totalListingsCreated}
      showFirstListingBanner={showFirstListingBanner}
      setShowFirstListingBanner={setShowFirstListingBanner}
      boostingListing={boostingListing}
      setBoostingListing={setBoostingListing}
    />
  );
}