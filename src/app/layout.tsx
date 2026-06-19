import type { Metadata, Viewport } from "next"
import { Geist, Fraunces } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers/Providers"
import { WorldCupBanner } from "@/components/layout/WorldCupBanner"

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
    <html lang="en" className={`${geist.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme (or the OS preference when "system") before
            paint, so there's no light flash. Default is "system". */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',!!d);}catch(e){}})();`,
          }}
        />
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
      </head>
      <body className={geist.className}>
        <WorldCupBanner />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
