import type { Metadata, Viewport } from "next"
import { Geist, Fraunces } from "next/font/google"
import "./globals.css"
import Script from "next/script"
import { Providers } from "@/components/providers/Providers"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: "BEEyond Trees - Sustaining Forest Adjacent Communities",
  description: "Sustaining Forest Adjacent Communities beyond tree planting and growing. A flagship initiative by EarthLungs Reforestation Foundation.",
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  themeColor: "#2D5A27",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${fraunces.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* One-time self-heal: a previous PWA service worker cached stale HTML
            and served mismatched JS chunks ("e.filter is not a function" /
            "This page couldn't load"). Unregister any SW + clear caches, then
            reload once so assets come back consistent. Runs during HTML parse,
            independent of chunk loading. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){if(!rs||!rs.length)return;Promise.all(rs.map(function(r){return r.unregister()})).then(function(){if(self.caches&&caches.keys){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k)})})}if(!sessionStorage.getItem('sw-killed')){sessionStorage.setItem('sw-killed','1');location.reload()}})});}}catch(e){}})();`,
          }}
        />
        <Script src="https://js.paystack.co/v1/inline.js" strategy="beforeInteractive" />
      </head>
      <body className={geist.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
