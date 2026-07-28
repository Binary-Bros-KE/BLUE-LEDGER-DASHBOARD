import type { MetadataRoute } from "next";

// Next.js's own file-convention metadata route — auto-served at /manifest.webmanifest and
// auto-linked into every page's <head>, no manual <link rel="manifest"> needed in layout.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DASHBOARD",
    short_name: "DASHBOARD",
    description: "Internal dashboard for managing Blue Ledger tenants.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4eee1",
    theme_color: "#16204a",
    icons: [
      { src: "/icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
