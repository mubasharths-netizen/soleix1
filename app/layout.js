import { Geist, Barlow_Condensed } from "next/font/google";
import { StoreProvider } from "@/components/StoreProvider";
import IntroOverlay from "@/components/IntroOverlay";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const display = Barlow_Condensed({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800"] });

export const metadata = {
  title: { default: "SOLEIX — Find Your Next Move", template: "%s | SOLEIX" },
  description: "A fresh perspective on everyday movement. Explore the SOLEIX collection of premium running, lifestyle and everyday sneakers. Prices in PKR.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }) {
  return <html lang="en" className={`${geist.variable} ${display.variable}`}><body><StoreProvider><IntroOverlay /><a className="skip-link" href="#main-content">Skip to content</a>{children}</StoreProvider></body></html>;
}
