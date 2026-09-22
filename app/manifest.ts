import type { MetadataRoute } from "next";

const logoIcon = "/ChatGPT%20Image%20Sep%2022%2C%202026%20at%2006_55_47%20PM.png?v=4";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "tea-posters",
    short_name: "tea-posters",
    description: "A local pass-and-play imposter game for tea breaks.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8ec",
    theme_color: "#ff6500",
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
