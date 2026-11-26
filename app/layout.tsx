import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Market Watchlist — Weltweite Large Caps",
  description:
    "Täglich aktualisierte Watchlist aller börsennotierten Unternehmen ab 50 Mrd. USD Marktkapitalisierung, geführt an ihrer Heimatbörse, mit mindestens zehn Jahren Kurshistorie.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
