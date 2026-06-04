import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterSW } from "@/app/register-sw";

export const metadata: Metadata = {
  title: "Coffee POS",
  description: "iPad-friendly coffee shop POS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Coffee POS",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

// viewport-fit=cover enables safe-area-inset-* CSS env vars on iOS
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#4b3427",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="h-full">
      <body className="h-full">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
