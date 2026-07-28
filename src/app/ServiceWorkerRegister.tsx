"use client";

import { useEffect } from "react";

/** Registers the no-op-fetch service worker (see public/sw.js) purely to make the install
 * prompt/"Add to Home Screen" available reliably across browsers. Best-effort — a failed
 * registration just means no install boost, never a broken app. */
export function ServiceWorkerRegister(): null {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
