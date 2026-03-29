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

export const metadata: Metadata = {
  title: {
    default: "Bookshelf",
    template: "%s — Bookshelf",
  },
  description:
    "Your reading life, beautifully organized. Track books, build shelves, set goals.",
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
