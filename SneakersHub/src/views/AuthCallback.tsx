"use client";

import { useEffect } from "react";
import { useNavigate } from "@/lib/router";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, needsRole, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (needsRole) {
      navigate("/auth", { replace: true });
    } else if (user) {
      if (typeof window !== "undefined" && "Notification" in window && (window as any).Notification?.permission === "default") {
        (window as any).Notification?.requestPermission?.().catch(() => {});
      }
      navigate("/", { replace: true });
    } else {
      navigate("/auth", { replace: true });
    }
  }, [user, needsRole, loading]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 w-full max-w-[220px]">
        <Skeleton className="w-14 h-14 rounded-full" />
        <div className="space-y-2.5 w-full">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-3/4 mx-auto" />
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;