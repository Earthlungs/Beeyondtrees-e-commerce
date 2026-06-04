import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import Script from "next/script"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Beeyond Trees",
  description: "Furniture, Home & Living, Pottery, Ornamental & Curios",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Beeyond Trees" },
}

export const viewport: Viewport = {
  themeColor: "#6B7D5C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <Script src="https://js.paystack.co/v1/inline.js" strategy="beforeInteractive" />
      </head>
      <body className={geist.className}>{children}</body>
    </html>
  )
}
