import type { Metadata, Viewport } from "next";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "@fontsource/roboto/900.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import "@/styles/safari-fixes.css";
import RegisterServiceWorker from "./register-service-worker";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sneakershub.site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SneakersHub",
    template: "%s | SneakersHub",
  },
  description:
    "Buy and sell authentic sneakers on SneakersHub. Discover exclusive drops, rare kicks, and verified pairs from a community of collectors.",
  applicationName: "SneakersHub",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-48x48.png",
    shortcut: "/icon-48x48.png",
  },
  openGraph: {
    title: "SneakersHub",
    description:
      "Buy and sell authentic sneakers. Discover exclusive drops and rare kicks.",
    type: "website",
    siteName: "SneakersHub",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "SneakersHub",
    description:
      "Buy and sell authentic sneakers. Discover exclusive drops and rare kicks.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark")t="light";var d=document.documentElement;d.classList.remove("light","dark");d.classList.add(t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"#ffffff":"#0a0a0a");}catch(e){document.documentElement.classList.add("light");}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <RegisterServiceWorker />
        <SpeedInsights />
      </body>
    </html>
  );
}
