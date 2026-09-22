import type { MetadataRoute } from "next";

const icon192 = "/icons/icon-192.png";
const icon512 = "/icons/icon-512.png";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "tea-posters",
    short_name: "tea-posters",
    description: "A local pass-and-play imposter game for tea breaks.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff8ec",
    theme_color: "#ff6500",
    icons: [
      {
        src: icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
