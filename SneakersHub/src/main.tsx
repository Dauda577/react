import { createRoot } from "react-dom/client";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { supabase } from "@/lib/supabase";
import App from "./App.tsx";
import "./index.css";
import "./styles/safari-fixes.css";

// ── Service Worker registration ───────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // When a new SW installs, skip waiting and activate immediately
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New SW installed — tell it to activate now
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch((err) => console.warn("SW registration failed:", err));

    // Listen for SW_ACTIVATED message — reload once to pick up new assets
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "SW_ACTIVATED") {
        // Only reload if we actually had a previous controller (i.e. this is an update, not first install)
        if (navigator.serviceWorker.controller) {
          window.location.reload();
        }
      }
    });

    // Safari-specific: detect blank page caused by stale JS chunks
    // If any script fails to load (chunk hash mismatch), reload once to recover
    window.addEventListener("error", (event) => {
      const target = event.target as HTMLElement;
      if (
        target &&
        target.tagName === "SCRIPT" &&
        !sessionStorage.getItem("chunk-reload-attempted")
      ) {
        sessionStorage.setItem("chunk-reload-attempted", "true");
        window.location.reload();
      }
    }, true); // capture phase to catch script load errors
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