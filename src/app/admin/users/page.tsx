"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Plus, X, Loader2, Ban, CheckCircle2, ShieldAlert, Eye, EyeOff } from "lucide-react"

const TEXT = "#4A3F2F"
const MUTED = "#A89F91"
const GREEN = "#6B7D5C"
const BROWN = "#8C6A4A"

interface U {
  id: string; username: string; name: string; role: string; active: boolean; createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<U[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ text: string; tone: "error" | "success" } | null>(null)

  const [f, setF] = useState({ username: "", name: "", password: "", role: "merchant" })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) setUsers(await res.json())
      else setNotice({ text: "Could not load users (admin only).", tone: "error" })
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 5000); return () => clearTimeout(t) }, [notice])

  const create = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) })
      const data = await res.json()
      if (!res.ok) { setNotice({ text: data.error || "Could not create user.", tone: "error" }); return }
      setNotice({ text: `Created ${data.username}`, tone: "success" })
      setF({ username: "", name: "", password: "", role: "merchant" })
      setShowForm(false)
      load()
    } catch { setNotice({ text: "Network error.", tone: "error" }) }
    finally { setSaving(false) }
  }

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id)
    try {
      const res = await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) })
      const data = await res.json()
      if (!res.ok) { setNotice({ text: data.error || "Update failed.", tone: "error" }); return }
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)))
    } catch { setNotice({ text: "Network error.", tone: "error" }) }
    finally { setBusyId(null) }
  }

  const roleBadge = (role: string) => {
    const c = role === "admin" ? GREEN : role === "cashier" ? "#7A6AA3" : BROWN
    return <span style={{ background: c, color: "white", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999, textTransform: "capitalize" }}>{role}</span>
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={22} color={GREEN} />
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>User Management</h1>
        </div>
        <Button onClick={() => setShowForm((s) => !s)} style={{ background: GREEN, color: "white", gap: 6 }}>
          {showForm ? <><X size={16} /> Close</> : <><Plus size={16} /> New User</>}
        </Button>
      </div>

      {notice && (
        <div style={{ background: notice.tone === "error" ? "#FBEAEA" : "#EAF3EA", color: notice.tone === "error" ? "#9B2C2C" : "#2F5D2F", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          {notice.tone === "error" ? <ShieldAlert size={15} /> : <CheckCircle2 size={15} />}{notice.text}
        </div>
      )}

      {showForm && (
        <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Field label="Username *"><Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></Field>
            <Field label="Full name *"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Password * (min 6)">
              <div style={{ position: "relative" }}>
                <Input type={showPw ? "text" : "password"} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} style={{ paddingRight: 38 }} />
                <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide password" : "Show password"}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 4, display: "flex" }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <Field label="Role">
              <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} style={{ width: "100%", height: 40, borderRadius: 8, border: "1px solid #E5E7EB", padding: "0 10px", color: TEXT }}>
                <option value="merchant">Merchant</option>
                <option value="cashier">Cashier (till only)</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={create} disabled={saving || !f.username || !f.name || !f.password} style={{ background: GREEN, color: "white", gap: 8 }}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : "Create User"}
            </Button>
          </div>
        </div>
      )}

      <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <p style={{ padding: 24, color: MUTED }}>Loading…</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAF8F3", fontSize: 12, color: MUTED, textAlign: "left" }}>
                <th style={th}>User</th><th style={th}>Role</th><th style={th}>Status</th><th style={{ ...th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid #F0EDE6", opacity: u.active ? 1 : 0.6 }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: MUTED }}>@{u.username}</div>
                  </td>
                  <td style={td}>
                    <select value={u.role} disabled={busyId === u.id} onChange={(e) => patch(u.id, { role: e.target.value })}
                      style={{ border: "1px solid #E5E7EB", borderRadius: 6, padding: "4px 6px", fontSize: 12, color: TEXT, background: "white" }}>
                      <option value="merchant">Merchant</option>
                      <option value="cashier">Cashier</option>
                      <option value="admin">Admin</option>
                    </select>{" "}
                    {roleBadge(u.role)}
                  </td>
                  <td style={td}>
                    {u.active
                      ? <span style={{ color: GREEN, fontSize: 12, fontWeight: 600 }}>● Active</span>
                      : <span style={{ color: BROWN, fontSize: 12, fontWeight: 600 }}>● Blocked</span>}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    {u.active ? (
                      <Button onClick={() => patch(u.id, { active: false })} disabled={busyId === u.id} variant="outline" style={{ color: BROWN, borderColor: BROWN, gap: 6, fontSize: 12, height: 32 }}>
                        <Ban size={14} /> Block
                      </Button>
                    ) : (
                      <Button onClick={() => patch(u.id, { active: true })} disabled={busyId === u.id} style={{ background: GREEN, color: "white", gap: 6, fontSize: 12, height: 32 }}>
                        <CheckCircle2 size={14} /> Reactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p style={{ marginTop: 12, fontSize: 12, color: MUTED }}>Cashiers can only use the POS till. Merchants get products, deliveries, LPO & invoicing. Admins get everything including analytics & user management. You can&apos;t block or demote your own account.</p>
    </div>
  )
}

const th: React.CSSProperties = { padding: "10px 14px", fontWeight: 600 }
const td: React.CSSProperties = { padding: "12px 14px", fontSize: 13.5, color: TEXT, verticalAlign: "middle" }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: TEXT, marginBottom: 4, display: "block" }}>{label}</span>
      {children}
    </label>
  )
}
