import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChessSight",
  description: "Chess learning app for openings and piece sight training",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
