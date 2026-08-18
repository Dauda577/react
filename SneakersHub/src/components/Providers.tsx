"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { SavedProvider } from "@/context/SavedContext";
import { ListingProvider } from "@/context/ListingContext";
import { PublicListingsProvider, PublicListing } from "@/context/PublicListingsContext";
import { RealtimeProvider } from "@/context/Realtimecontext";
import { Toaster } from "@/components/ui/toaster";

const Chain = ({ children }: { children: ReactNode }) => (
  <AuthProvider>
    <SavedProvider>
      <ListingProvider>
        <RealtimeProvider>
          {children}
          <Toaster />
        </RealtimeProvider>
      </ListingProvider>
    </SavedProvider>
  </AuthProvider>
);

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <Chain>
    <PublicListingsProvider>{children}</PublicListingsProvider>
  </Chain>
);

export const StoreProviders = ({
  children,
  initialListings,
}: {
  children: ReactNode;
  initialListings?: PublicListing[];
}) => (
  <Chain>
    <PublicListingsProvider initialListings={initialListings}>{children}</PublicListingsProvider>
  </Chain>
);
