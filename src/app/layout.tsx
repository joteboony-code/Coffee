import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coffee POS",
  description: "iPad-friendly coffee shop POS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Coffee POS",
  },
};

// viewport-fit=cover enables safe-area-inset-* CSS env vars on iOS
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
