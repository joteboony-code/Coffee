import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coffee POS",
  description: "iPad-friendly coffee shop POS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
