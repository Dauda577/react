import { createRoot } from "react-dom/client";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { supabase } from "@/lib/supabase";
import App from "./App.tsx";
import "./index.css";

// ── Service Worker registration ───────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {

    // ── Chunk error recovery (stale cache after deploy) ──────────────────
    // Must be registered BEFORE SW registration so it catches any immediate
    // script load failures. Uses sessionStorage to prevent infinite loops.
    window.addEventListener("error", (event) => {
      const target = event.target as HTMLElement;
      if (
        target?.tagName === "SCRIPT" &&
        !sessionStorage.getItem("chunk-reload-attempted")
      ) {
        sessionStorage.setItem("chunk-reload-attempted", "true");
        // Clear all caches so the SW doesn't serve stale chunks again
        caches.keys().then((names) => {
          Promise.all(names.map((n) => caches.delete(n))).then(() => {
            window.location.reload();
          });
        });
      }
    }, true);

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Track whether there was already a controller before this page load.
        // If not, this is a first install — don't reload, just activate silently.
        const hadControllerOnLoad = !!navigator.serviceWorker.controller;

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              if (hadControllerOnLoad) {
                // There was an old SW — tell new one to take over immediately
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
              // If no previous controller: first install, no reload needed
            }
          });
        });

        // When the new SW activates and takes control, do ONE reload
        let reloadScheduled = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (hadControllerOnLoad && !reloadScheduled) {
            reloadScheduled = true;
            // Small delay to let the SW finish activating
            setTimeout(() => window.location.reload(), 100);
          }
        });
      })
      .catch((err) => console.warn("SW registration failed:", err));
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