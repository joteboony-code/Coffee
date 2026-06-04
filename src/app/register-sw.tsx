"use client";

import { useEffect } from "react";

/**
 * Registers a minimal, safe service worker in production only.
 * The SW is network-first (never serves stale pages/API), and only
 * cache-serves immutable hashed assets when offline.
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore registration failures — app still works without SW */
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
