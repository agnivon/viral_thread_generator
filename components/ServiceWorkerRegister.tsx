"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          void reg.update();
        })
        .catch((err: unknown) => {
          console.error("Service worker registration failed:", err);
        });
    }
  }, []);

  return null;
}
