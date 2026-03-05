import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "no-mess",
    short_name: "no-mess",
    description:
      "A stupid-simple headless CMS for devs and their clients. Zero bloat. Zero config. Just ship.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f5f1",
    theme_color: "#008e92",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
