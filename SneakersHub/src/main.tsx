import { createRoot } from "react-dom/client";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { supabase } from "@/lib/supabase";
import App from "./App.tsx";
import "./index.css";

// Unregister all service workers and clear caches permanently
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.unregister());
  });

  caches.keys().then((cacheNames) => {
    cacheNames.forEach((cacheName) => caches.delete(cacheName));
  });
}

// Wake up Supabase immediately on app load (prevents cold start delay)
supabase.from("profiles").select("id").limit(1).then(() => {});

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <SpeedInsights />
  </>
);