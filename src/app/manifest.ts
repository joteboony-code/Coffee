import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coffee POS",
    short_name: "Coffee POS",
    description: "ระบบขายหน้าร้านคาเฟ่ สำหรับ iPad",
    start_url: "/pos",
    display: "standalone",
    orientation: "landscape",
    background_color: "#f7f2ea",
    theme_color: "#4b3427",
    lang: "th",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
