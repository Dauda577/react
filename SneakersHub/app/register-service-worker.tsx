"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function RegisterServiceWorker() {
  const pathname = usePathname();

  const resetViewportZoom = () => {
    const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!viewport) return;
    const original = viewport.content;
    viewport.content = original + ", maximum-scale=1";
    setTimeout(() => {
      viewport.content = original;
    }, 100);
  };

  useEffect(() => {
    window.addEventListener("popstate", resetViewportZoom);
    const origPushState = history.pushState.bind(history);
    history.pushState = function (...args: Parameters<typeof history.pushState>) {
      origPushState(...args);
      resetViewportZoom();
    };

    return () => {
      window.removeEventListener("popstate", resetViewportZoom);
      history.pushState = origPushState;
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", async () => {
      try {
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
              if (!reloaded) {
                reloaded = true;
                window.location.reload();
              }
            });
          })
          .catch((err) => console.warn("SW registration failed:", err));

        window.addEventListener(
          "error",
          (event) => {
            const target = event.target as HTMLElement;
            if (target?.tagName === "SCRIPT" && !sessionStorage.getItem("chunk-reload-attempted")) {
              sessionStorage.setItem("chunk-reload-attempted", "true");
              window.location.reload();
            }
          },
          true
        );
      } catch (err) {
        console.warn("SW registration failed:", err);
      }
    });
  }, []);

  useEffect(() => {
    resetViewportZoom();
  }, [pathname]);

  return null;
}
