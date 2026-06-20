// Root layout for the App Router application.
// Everything rendered by Next.js passes through this file, so it is the right
// place for global fonts, metadata, analytics snippets, and app-wide providers.
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import AuthProvider from "@/components/AuthProvider";
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

const GTM_ID = "GTM-TX54NCRN";

// Next.js App Router reads exported metadata from layouts/pages and turns it
// into document <head> tags for every route nested under this layout.
export const metadata: Metadata = {
  title: "Travel Journal",
  description: "Document your travels with interactive maps, journals, and passport stamps",
};

// The viewport export is the App Router replacement for hand-writing the
// viewport meta tag in a custom document.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// RootLayout is a Server Component by default. It composes static shell concerns
// and then hands interactive auth/session work to the client-side AuthProvider.
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
        {/* Google Tag Manager needs to run before the page becomes interactive so analytics sees all routes. */}
        <Script id="google-tag-manager" strategy="beforeInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `}
        </Script>
        <noscript>
          {/* The noscript iframe keeps GTM functional for users with JavaScript disabled. */}
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* AuthProvider owns client-side Supabase session hydration for the whole app. */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
