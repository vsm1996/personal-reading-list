import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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

// Runs synchronously before first paint to set data-mode without a flash.
// Checks localStorage first, then falls back to the OS preference.
// data-mode is consumed by @renge-ui/tailwind/plugin (data-profile is static).
// Keep this in sync with theme-persistence.ts THEME_KEY.
const themeInitScript = `(function(){try{var t=localStorage.getItem('bookshelf-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-mode',t);return;}}catch(e){}document.documentElement.setAttribute('data-mode',window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: the inline script sets data-mode before React
    // hydrates, so the server-rendered <html> won't have data-mode, causing a
    // benign mismatch. Suppressing it here is intentional and safe.
    <html lang="en" className={`${inter.variable} ${lora.variable}`} data-profile="earth" suppressHydrationWarning>
      <head>
        {/* Theme init — must be first to prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
