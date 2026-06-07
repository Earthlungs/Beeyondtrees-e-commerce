import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import Script from "next/script"
import { Providers } from "@/components/providers/Providers"

const geist = Geist({ subsets: ["latin"] })

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
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <Script src="https://js.paystack.co/v1/inline.js" strategy="beforeInteractive" />
      </head>
      <body className={geist.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
