"use client"

import { useState } from "react"
import { Mail, Loader2, Check } from "lucide-react"

const GREEN = "#6B7D5C"

// Inline "email this document" control shown on the LPO / Invoice / Receipt doc
// pages. POSTs { email } to `endpoint`. Hidden when printing (.no-print).
export default function DocEmailButton({
  endpoint,
  defaultEmail = "",
  label = "Email document",
}: {
  endpoint: string
  defaultEmail?: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(defaultEmail)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const send = async () => {
    setError(""); setSent(false)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address."); return
    }
    setSending(true)
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || "Could not send the email."); return }
      setSent(true)
    } catch { setError("Network error. Try again.") }
    finally { setSending(false) }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="no-print"
        style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "white", color: GREEN, border: `1px solid ${GREEN}`, borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
      >
        <Mail size={15} /> {label}
      </button>
    )
  }

  return (
    <div className="no-print" style={{ display: "inline-flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setSent(false); setError("") }}
          placeholder="name@email.com"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") send() }}
          style={{ height: 40, padding: "0 12px", border: "1px solid #ccc", borderRadius: 8, fontSize: 14, minWidth: 240 }}
        />
        <button
          onClick={send}
          disabled={sending}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, background: sent ? "#2F7D32" : GREEN, color: "white", border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
        >
          {sending ? <><Loader2 size={15} className="animate-spin" /> Sending…</>
            : sent ? <><Check size={15} /> Sent</>
            : <><Mail size={15} /> Send</>}
        </button>
      </div>
      {error && <span style={{ color: "#C0392B", fontSize: 12.5 }}>{error}</span>}
      {sent && <span style={{ color: "#2F7D32", fontSize: 12.5 }}>Emailed to {email.trim()}.</span>}
    </div>
  )
}
