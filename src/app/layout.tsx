import type { Metadata, Viewport } from "next";
import {
  Playfair_Display,
  Crimson_Pro,
  Caveat,
} from "next/font/google";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const crimsonPro = Crimson_Pro({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const caveat = Caveat({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Travel Journal",
  description: "Document your travels with interactive maps, journals, and passport stamps",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

import AuthProvider from '@/components/AuthProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${crimsonPro.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
