import type { Metadata, Viewport } from "next";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "@fontsource/roboto/900.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import "@/styles/safari-fixes.css";
import RegisterServiceWorker from "./register-service-worker";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shoplite.site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ShopLite",
    template: "%s | ShopLite",
  },
  description:
    "Buy and sell anything on ShopLite. Discover great deals, verified sellers, and a trusted community marketplace.",
  applicationName: "ShopLite",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-48x48.png",
    shortcut: "/icon-48x48.png",
  },
  openGraph: {
    title: "ShopLite",
    description:
      "Buy and sell anything. Great deals from verified sellers.",
    type: "website",
    siteName: "ShopLite",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "ShopLite",
    description:
      "Buy and sell anything. Great deals from verified sellers.",
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
