import { createRoot } from "react-dom/client";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { supabase } from "@/lib/supabase";
import App from "./App.tsx";
import "./index.css";


function resetViewportZoom() {
  const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
  if (!viewport) return;
  const original = viewport.content;
  viewport.content = original + ', maximum-scale=1';
  setTimeout(() => { viewport.content = original; }, 100);
}

window.addEventListener('popstate', resetViewportZoom);
const origPushState = history.pushState.bind(history);
history.pushState = function(...args) {
  origPushState(...args);
  resetViewportZoom();
};

// ── Service Worker registration ───────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    // Unregister stale service workers to force cache clear on new deploys
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      const swUrl = reg.active?.scriptURL ?? "";
      if (!swUrl.includes("sw.js")) {
        await reg.unregister();
      }
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        let reloaded = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!reloaded) { reloaded = true; window.location.reload(); }
        });
      })
      .catch((err) => console.warn("SW registration failed:", err));

    window.addEventListener("error", (event) => {
      const target = event.target as HTMLElement;
      if (target?.tagName === "SCRIPT" && !sessionStorage.getItem("chunk-reload-attempted")) {
        sessionStorage.setItem("chunk-reload-attempted", "true");
        window.location.reload();
      }
    }, true);
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