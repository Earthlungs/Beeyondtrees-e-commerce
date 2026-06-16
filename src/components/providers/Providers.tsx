"use client"

import { SessionProvider } from "next-auth/react"
import InstallPrompt from "@/components/pwa/InstallPrompt"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <InstallPrompt />
    </SessionProvider>
  )
}
