import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Draft Board",
  description: "Tier and rerank your fantasy draft board, with Claude as a second opinion.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
