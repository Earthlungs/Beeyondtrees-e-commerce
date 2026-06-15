"use client"

import { useEffect, useRef } from "react"

// Real "Continue with Google" via Google Identity Services. Renders Google's
// official button; on success it decodes the returned ID token (a JWT) to read
// the signed-in user's name / email / avatar. Only needs a *public* client id
// (NEXT_PUBLIC_GOOGLE_CLIENT_ID) whose authorized JS origins include this site.

declare global {
  interface Window {
    google?: any
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

function decodeJwt(token: string): any {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )
    return JSON.parse(json)
  } catch {
    return {}
  }
}

export function GoogleSignIn({ onSuccess }: { onSuccess: (p: { name: string; email: string; picture?: string }) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!CLIENT_ID) return
    const SCRIPT_ID = "google-gsi"

    const init = () => {
      if (!window.google?.accounts?.id || !ref.current) return
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (resp: { credential: string }) => {
          const p = decodeJwt(resp.credential)
          if (p?.email) onSuccess({ name: p.name || p.email.split("@")[0], email: p.email, picture: p.picture })
        },
      })
      window.google.accounts.id.renderButton(ref.current, {
        theme: "outline", size: "large", text: "continue_with", shape: "pill", width: 336,
      })
    }

    if (window.google?.accounts?.id) {
      init()
    } else if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement("script")
      s.src = "https://accounts.google.com/gsi/client"
      s.async = true
      s.defer = true
      s.id = SCRIPT_ID
      s.onload = init
      document.head.appendChild(s)
    } else {
      document.getElementById(SCRIPT_ID)!.addEventListener("load", init)
    }
  }, [onSuccess])

  if (!CLIENT_ID) {
    return (
      <div style={{ padding: "11px 16px", borderRadius: 999, border: "1px dashed #D4C9B8", textAlign: "center", fontSize: 13, color: "#A89F91", background: "#FAF7F0" }}>
        Google sign-in needs <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>
      </div>
    )
  }

  return <div ref={ref} style={{ display: "flex", justifyContent: "center", minHeight: 44 }} />
}
