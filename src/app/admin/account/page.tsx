"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserCog, Loader2, ShieldAlert, CheckCircle2, Eye, EyeOff } from "lucide-react"
import ImageUploader from "@/components/admin/ImageUploader"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const RED = "#C0392B"
const field: React.CSSProperties = { width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT }
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 4, display: "block" }

interface Account { username: string; name: string; email: string | null; phone: string | null; image: string | null; role: string; mustChangePassword: boolean }

export default function AccountPage() {
  const { update } = useSession()
  const [acc, setAcc] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<{ text: string; tone: "error" | "success" } | null>(null)

  const [cur, setCur] = useState("")
  const [nw, setNw] = useState("")
  const [showCur, setShowCur] = useState(false)
  const [showNw, setShowNw] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [savingPic, setSavingPic] = useState(false)

  const load = async () => {
    try { const res = await fetch("/api/account"); if (res.ok) setAcc(await res.json()) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 5000); return () => clearTimeout(t) }, [notice])

  const changePassword = async () => {
    if (nw.length < 6) { setNotice({ text: "New password must be at least 6 characters.", tone: "error" }); return }
    setSavingPw(true)
    try {
      const res = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: cur, newPassword: nw }) })
      const data = await res.json()
      if (!res.ok) { setNotice({ text: data.error || "Could not change password.", tone: "error" }); return }
      setNotice({ text: "Password updated.", tone: "success" })
      setCur(""); setNw("")
      setAcc((a) => (a ? { ...a, mustChangePassword: false } : a))
      await update({ mustChangePassword: false })
    } catch { setNotice({ text: "Network error.", tone: "error" }) }
    finally { setSavingPw(false) }
  }

  const saveAvatar = async (urls: string[]) => {
    const image = urls[0] ?? null
    setAcc((a) => (a ? { ...a, image } : a))
    setSavingPic(true)
    try {
      const res = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }) })
      if (!res.ok) { setNotice({ text: "Could not save picture.", tone: "error" }); return }
      await update({ image })
      setNotice({ text: "Profile picture updated.", tone: "success" })
    } catch { setNotice({ text: "Network error.", tone: "error" }) }
    finally { setSavingPic(false) }
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
  if (!acc) return <div style={{ padding: 40, color: MUTED }}>Could not load your account.</div>

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <UserCog size={22} color={GREEN} />
        <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>My Account</h1>
      </div>

      {acc.mustChangePassword && (
        <div style={{ background: "#FDEDED", border: `1px solid ${RED}`, color: RED, padding: "12px 14px", borderRadius: 10, fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
          You're using a temporary password (your phone number). Please set a new password below.
        </div>
      )}
      {notice && (
        <div style={{ background: notice.tone === "error" ? "#FBEAEA" : "#EAF3EA", color: notice.tone === "error" ? "#9B2C2C" : "#2F5D2F", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          {notice.tone === "error" ? <ShieldAlert size={15} /> : <CheckCircle2 size={15} />}{notice.text}
        </div>
      )}

      <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: MUTED }}>
          <div><b style={{ color: TEXT }}>{acc.name}</b> · @{acc.username}</div>
          <div>{acc.email || "—"} · {acc.phone || "no phone"} · role: {acc.role.replace("_", " ")}</div>
        </div>
      </div>

      <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 10 }}>Profile Picture {savingPic && <Loader2 size={13} className="animate-spin" style={{ display: "inline" }} />}</h2>
        <ImageUploader value={acc.image ? [acc.image] : []} onChange={saveAvatar} single />
      </div>

      <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Change Password</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {!acc.mustChangePassword && (
            <div>
              <label style={label}>Current Password</label>
              <div style={{ position: "relative" }}>
                <Input style={{ ...field, paddingRight: 40 }} type={showCur ? "text" : "password"} value={cur} onChange={(e) => setCur(e.target.value)} />
                <button type="button" onClick={() => setShowCur((s) => !s)} aria-label={showCur ? "Hide password" : "Show password"}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 4, display: "flex" }}>
                  {showCur ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}
          <div>
            <label style={label}>New Password (min 6)</label>
            <div style={{ position: "relative" }}>
              <Input style={{ ...field, paddingRight: 40 }} type={showNw ? "text" : "password"} value={nw} onChange={(e) => setNw(e.target.value)} />
              <button type="button" onClick={() => setShowNw((s) => !s)} aria-label={showNw ? "Hide password" : "Show password"}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 4, display: "flex" }}>
                {showNw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
        <Button onClick={changePassword} disabled={savingPw || nw.length < 6} style={{ background: GREEN, color: "white", marginTop: 14, gap: 6 }}>
          {savingPw && <Loader2 size={16} className="animate-spin" />} Update Password
        </Button>
      </div>
    </div>
  )
}
