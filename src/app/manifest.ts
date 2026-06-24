import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pollita",
    short_name: "Pollita",
    description: "Sports predictions platform",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a12",
    theme_color: "#38BDF8",
    icons: [
      {
        src: "/icons/pollita-icon-192-v2.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pollita-icon-512-v2.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pollita-maskable-icon-512-v2.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
