import type { MetadataRoute } from "next";

const logoIcon = "/ChatGPT%20Image%20Sep%2022%2C%202026%20at%2011_38_07%20AM.png?v=3";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "tea-posters",
    short_name: "tea-posters",
    description: "A minimal offline imposter game",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f1e7",
    theme_color: "#f7f1e7",
    icons: [
      {
        src: logoIcon,
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
