"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Settings as SettingsIcon, Monitor, Moon, Check } from "lucide-react"
import { applyTheme, type Theme } from "@/lib/theme"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const CARD = "var(--admin-card)"
const BORDER = "var(--admin-border)"
const GREEN = "#6B7D5C"

const OPTIONS: { value: Theme; label: string; desc: string; icon: typeof Monitor }[] = [
  { value: "system", label: "System", desc: "Match your device — the default look", icon: Monitor },
  { value: "dark", label: "Dark", desc: "Black & white dark mode", icon: Moon },
]

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const [theme, setThemeState] = useState<Theme>("system")

  // The theme is per-user (stored on the account), so one user's choice never
  // changes another user's theme on the same browser.
  useEffect(() => {
    const t = (session?.user as { theme?: string } | undefined)?.theme
    if (t === "dark" || t === "light" || t === "system") setThemeState(t)
  }, [session])

  const setTheme = async (t: Theme) => {
    setThemeState(t)
    applyTheme(t)
    try { localStorage.setItem("theme", t) } catch {}
    await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: t }) }).catch(() => {})
    await update({ theme: t })
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <SettingsIcon size={22} color={GREEN} />
        <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Settings</h1>
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 4 }}>Appearance</h2>
        <p style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>Choose how BEEyond Trees looks. System follows your device and is the default.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {OPTIONS.map((o) => {
            const Icon = o.icon
            const active = theme === o.value
            return (
              <button key={o.value} onClick={() => setTheme(o.value)} style={{
                display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                border: `2px solid ${active ? GREEN : BORDER}`, background: active ? "rgba(107,125,92,0.12)" : CARD,
              }}>
                <Icon size={22} color={active ? GREEN : MUTED} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{o.label}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{o.desc}</div>
                </div>
                {active && <Check size={18} color={GREEN} />}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 10 }}>About</h2>
        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.7 }}>
          <div>BEEyond Trees admin · EarthLungs Reforestation Foundation</div>
          <div>Store management, point of sale, value-chain tracing &amp; reporting.</div>
        </div>
      </div>
    </div>
  )
}
