"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Download } from "lucide-react"

// The installed app is a staff tool: it opens at the auth page (manifest
// start_url = /admin/login) and the install prompt only surfaces there. We
// capture `beforeinstallprompt` globally and suppress the browser's native
// banner everywhere, then expose a custom "Install app" button ONLY on the
// auth page. Mounted once in Providers so the event is never missed.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

// The auth page is the only place the prompt is allowed to appear.
const AUTH_PATH = "/admin/login"

export default function InstallPrompt() {
  const pathname = usePathname()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Suppress the native mini-infobar everywhere; we drive the prompt ourselves.
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => { setInstalled(true); setDeferred(null) }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  // Only show on the auth page, and only when an install is actually available.
  if (pathname !== AUTH_PATH || installed || !deferred) return null

  const install = async () => {
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }

  return (
    <button
      onClick={install}
      style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 60,
        display: "flex", alignItems: "center", gap: 8,
        padding: "11px 18px", borderRadius: 10, border: "none", cursor: "pointer",
        background: "#6B7D5C", color: "white", fontSize: 14, fontWeight: 600,
        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
      }}
    >
      <Download size={16} /> Install app
    </button>
  )
}
