"use client";

import { useEffect } from "react";

/**
 * Registers the offline service worker in production only.
 *
 * In development the service worker is actively removed and its caches are
 * cleared. A stale worker can otherwise serve old HTML/chunks and cause
 * hydration mismatches that look like application bugs.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      const cleanUp = async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map((registration) => registration.unregister()),
          );
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
          }
        } catch {
          // Best effort: development still works without cache cleanup.
        }
      };
      void cleanUp();
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installation still works without a service worker; features that
        // require connectivity continue to work normally.
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
