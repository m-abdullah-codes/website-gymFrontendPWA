import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gym App",
    short_name: "Gym",
    description:
      "Your training plan, meals and progress — everything runs on your device.",
    start_url: "/home",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000814",
    theme_color: "#000814",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
