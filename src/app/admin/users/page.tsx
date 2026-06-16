"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Plus, X, Loader2, Ban, CheckCircle2, ShieldAlert, Trash2 } from "lucide-react"
import { ROLE_LABELS } from "@/lib/tracing-stages"
import { ConfirmModal } from "@/components/admin/ConfirmModal"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const BROWN = "#8C6A4A"

interface U {
  id: string; username: string; name: string; role: string; active: boolean; createdAt: string
}

// Selectable roles. The 9 *_officer/manager/executive roles drive the product
// tracing pipeline (src/lib/tracing-stages.ts); cashier is till-only.
const ROLE_OPTIONS: [string, string][] = [
  ["merchant", "Merchant"], ["cashier", "Cashier (till only)"], ["admin", "Admin"],
  ["it_specialist", "IT Specialist (full control)"],
  ["factory_manager", "Factory Manager"], ["executive", "Executive"],
  ["procurement_officer", "Procurement Officer"], ["quality_inspector", "Quality Inspector"],
  ["requisition_officer", "Requisition Officer"], ["agribusiness_manager", "Agribusiness Manager"],
  ["production_officer", "Production Officer"], ["dispatch_officer", "Dispatch Officer"],
  ["receiving_officer", "Receiving Officer"],
]

export default function UsersPage() {
  const [users, setUsers] = useState<U[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ text: string; tone: "error" | "success" } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<U | null>(null)

  // Single creation flow: first name + phone + role. The username and the
  // @earthlungs.org email are derived; the phone is the initial password (the
  // user is forced to change it on first login).
  const [showAdd, setShowAdd] = useState(false)
  const [pv, setPv] = useState({ firstName: "", phone: "", role: "merchant" })
  const [provisioning, setProvisioning] = useState(false)

  const load = async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) setUsers(await res.json())
      else setNotice({ text: "Could not load users (admin only).", tone: "error" })
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 5000); return () => clearTimeout(t) }, [notice])

  const provision = async () => {
    setProvisioning(true)
    try {
      const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pv) })
      const data = await res.json()
      if (!res.ok) { setNotice({ text: data.error || "Could not create user.", tone: "error" }); return }
      setNotice({ text: `Created ${data.username} (${data.email}) — login password = phone, must change on first login.`, tone: "success" })
      setPv({ firstName: "", phone: "", role: "merchant" })
      setShowAdd(false)
      load()
    } catch { setNotice({ text: "Network error.", tone: "error" }) }
    finally { setProvisioning(false) }
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

  const del = async (u: U) => {
    setBusyId(u.id)
    try {
      const res = await fetch("/api/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setNotice({ text: data.error || "Delete failed.", tone: "error" }); return }
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
      setNotice({ text: `Deleted @${u.username}.`, tone: "success" })
    } catch { setNotice({ text: "Network error.", tone: "error" }) }
    finally { setBusyId(null) }
  }

  const roleBadge = (role: string) => {
    const c = role === "admin" ? GREEN : role === "it_specialist" ? "#2C5282" : role === "cashier" ? "#7A6AA3" : BROWN
    return <span style={{ background: c, color: "white", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999 }}>{ROLE_LABELS[role] ?? role}</span>
  }

  return (
    <div>
      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete @${deleteTarget?.username}?`}
        message={`Permanently delete ${deleteTarget?.name}. This cannot be undone — they will no longer be able to sign in.`}
        confirmLabel="Delete permanently"
        danger
        onConfirm={() => { if (deleteTarget) { del(deleteTarget); setDeleteTarget(null) } }}
        onCancel={() => setDeleteTarget(null)}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={22} color={GREEN} />
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>User Management</h1>
        </div>
        <Button onClick={() => setShowAdd((s) => !s)} style={{ background: GREEN, color: "white", gap: 6 }}>
          {showAdd ? <><X size={16} /> Close</> : <><Plus size={16} /> Add User</>}
        </Button>
      </div>

      {notice && (
        <div style={{ background: notice.tone === "error" ? "#FBEAEA" : "#EAF3EA", color: notice.tone === "error" ? "#9B2C2C" : "#2F5D2F", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          {notice.tone === "error" ? <ShieldAlert size={15} /> : <CheckCircle2 size={15} />}{notice.text}
        </div>
      )}

      {showAdd && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 4 }}>Add User</h2>
          <p style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>
            Enter the <b>first name only</b> — it becomes the login username and the <b>@earthlungs.org</b> email is auto-completed. The <b>phone number is the initial password</b>; the user must change it on first login.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <Field label="First name *">
              {/* email suffix shown inline so it's clear the domain is auto-completed */}
              <div style={{ display: "flex", alignItems: "stretch", border: "1px solid var(--admin-border)", borderRadius: 8, overflow: "hidden" }}>
                <input value={pv.firstName} onChange={(e) => setPv({ ...pv, firstName: e.target.value.toLowerCase().replace(/\s+/g, "") })} placeholder="john"
                  style={{ flex: 1, minWidth: 0, height: 40, border: "none", padding: "0 10px", color: TEXT, outline: "none" }} />
                <span style={{ display: "flex", alignItems: "center", padding: "0 10px", background: "var(--admin-card-2)", color: MUTED, fontSize: 13, whiteSpace: "nowrap" }}>@earthlungs.org</span>
              </div>
            </Field>
            <Field label="Phone number * (initial password)"><Input value={pv.phone} onChange={(e) => setPv({ ...pv, phone: e.target.value })} placeholder="e.g. 0712345678" /></Field>
            <Field label="Role">
              <select value={pv.role} onChange={(e) => setPv({ ...pv, role: e.target.value })} style={{ width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT }}>
                {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </div>
          {pv.firstName.trim() && (
            <p style={{ fontSize: 12, color: GREEN, marginTop: 10 }}>
              → login username <b>{pv.firstName.trim()}</b> · email <b>{pv.firstName.trim()}@earthlungs.org</b> · password = phone
            </p>
          )}
          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={provision} disabled={provisioning || !pv.firstName.trim() || pv.phone.trim().length < 6} style={{ background: GREEN, color: "white", gap: 8 }}>
              {provisioning ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : "Create User"}
            </Button>
          </div>
        </div>
      )}

      <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <p style={{ padding: 24, color: MUTED }}>Loading…</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--admin-card-2)", fontSize: 12, color: MUTED, textAlign: "left" }}>
                <th style={th}>User</th><th style={th}>Role</th><th style={th}>Status</th><th style={{ ...th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid var(--admin-border)", opacity: u.active ? 1 : 0.6 }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: MUTED }}>@{u.username}</div>
                  </td>
                  <td style={td}>
                    <select value={u.role} disabled={busyId === u.id} onChange={(e) => patch(u.id, { role: e.target.value })}
                      style={{ border: "1px solid var(--admin-border)", borderRadius: 6, padding: "4px 6px", fontSize: 12, color: TEXT, background: "var(--admin-card)" }}>
                      {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>{" "}
                    {roleBadge(u.role)}
                  </td>
                  <td style={td}>
                    {u.active
                      ? <span style={{ color: GREEN, fontSize: 12, fontWeight: 600 }}>● Active</span>
                      : <span style={{ color: BROWN, fontSize: 12, fontWeight: 600 }}>● Blocked</span>}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8, justifyContent: "flex-end" }}>
                      {u.active ? (
                        <Button onClick={() => patch(u.id, { active: false })} disabled={busyId === u.id} variant="outline" style={{ color: BROWN, borderColor: BROWN, gap: 6, fontSize: 12, height: 32 }}>
                          <Ban size={14} /> Block
                        </Button>
                      ) : (
                        <Button onClick={() => patch(u.id, { active: true })} disabled={busyId === u.id} style={{ background: GREEN, color: "white", gap: 6, fontSize: 12, height: 32 }}>
                          <CheckCircle2 size={14} /> Reactivate
                        </Button>
                      )}
                      <Button onClick={() => setDeleteTarget(u)} disabled={busyId === u.id} variant="outline" style={{ color: "#C0392B", borderColor: "#C0392B", gap: 6, fontSize: 12, height: 32 }}>
                        <Trash2 size={14} /> Delete
                      </Button>
                    </div>
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
