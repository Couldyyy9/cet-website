import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/const";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "四六级真题 · 在线做题 · 错题本",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffcd68",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
