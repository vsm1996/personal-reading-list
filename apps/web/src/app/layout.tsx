import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { tokenCSS } from "@/lib/theme";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const siteUrl = "https://the-hondana.vercel.app/"
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Bookshelf",
    template: "%s — Bookshelf",
  },
  description:
    "Your reading life, beautifully organized. Track books, build shelves, set goals.",
  authors: [{ name: "Vanessa Martin" }],
  openGraph: {
    title: "The Hondana — Your personal reading tracker",
    description:
      "Your reading life, beautifully organized. Track books, build shelves, set goals.",
    type: "website",
    url: siteUrl,
    images: [
      {
        url: `${siteUrl}/images/ogImage.png`,
        width: 1200,
        height: 630,
        alt: "The Hondana — Your personal reading tracker",
      },
    ],
  },
  twitter: {
    title: "The Hondana — Your personal reading tracker",
    description:
      "Your reading life, beautifully organized. Track books, build shelves, set goals.",
    card: "summary_large_image",
    images: [
      `${siteUrl}/images/ogImage.png`,
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <head>
        {/* Renge earth tokens — injected before Tailwind so CSS vars resolve correctly */}
        <style dangerouslySetInnerHTML={{ __html: tokenCSS }} />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
