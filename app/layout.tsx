import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Musicians Legit — AI contracts for indie artists",
  description:
    "Generate music contracts (split sheets, producer agreements, sync licenses, gig contracts, and more) from a plain-English description. US jurisdiction. Free to start.",
  themeColor: "#1a1a24",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
