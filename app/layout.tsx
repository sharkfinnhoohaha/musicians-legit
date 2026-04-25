import type { Metadata } from "next";
import { Fraunces, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Musicians Legit — Music contracts, drafted with the rigor of a paralegal.",
  description:
    "AI-drafted music contracts grounded in US industry conventions. Split sheets, producer agreements, sync licenses, gig contracts, and more — from a plain-English description, with a transparent confidence score.",
  themeColor: "#f7f3ea",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${dmSans.variable} ${jetbrains.variable}`}
    >
      <body>
        <SiteNav />
        <div className="pt-[64px]">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
