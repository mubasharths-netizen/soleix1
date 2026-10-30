import { Geist, Barlow_Condensed } from "next/font/google";
import { StoreProvider } from "@/components/StoreProvider";
import IntroOverlay from "@/components/IntroOverlay";
import ConsentBanner from "@/components/ConsentBanner";
import JsonLd, { organization, webSite } from "@/components/JsonLd";
import { SITE_URL, brand } from "@/lib/site.js";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const display = Barlow_Condensed({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800"] });

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: brand.title, template: "%s | SOLEIX" },
  description: brand.description,
  applicationName: brand.name,
  author: "SOLEIX",
  creator: "SOLEIX",
  publisher: "SOLEIX",
  keywords: ["sneakers Pakistan", "running shoes", "trail shoes", "lifestyle sneakers", "cash on delivery", "SOLEIX"],
  icons: { icon: "/icon.svg", shortcut: "/favicon.ico" },
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: brand.name,
    locale: brand.locale,
    url: SITE_URL,
    title: brand.title,
    description: brand.description,
  },
  twitter: { card: "summary_large_image", title: brand.title, description: brand.description },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export const viewport = {
  themeColor: brand.themeColor,
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return <html lang="en" className={`${geist.variable} ${display.variable}`}><body><StoreProvider><IntroOverlay /><ConsentBanner /><a className="skip-link" href="#main-content">Skip to content</a>{children}<JsonLd data={[organization(), webSite()]} /></StoreProvider></body></html>;
}
