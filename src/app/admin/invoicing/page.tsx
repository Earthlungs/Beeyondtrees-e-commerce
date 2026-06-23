"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Plus, X, Loader2, Printer } from "lucide-react"
import DocLineItems, { EditLine, emptyLine } from "@/components/admin/DocLineItems"
import { SuccessModal } from "@/components/admin/ConfirmModal"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const ksh = (n: number) => `KSh ${n.toLocaleString()}`

interface Invoice {
  id: string; number: string; customerName: string; date: string; total: number
}

export default function InvoicingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || ""
  const isAdmin = role === "admin" || role === "it_specialist"
  const canCreate = role === "procurement_officer" || role === "executive" || isAdmin
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<{ id: string; number: string; emailed: boolean } | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [customerName, setCustomerName] = useState("")
  const [customerContact, setCustomerContact] = useState("")
  const [email, setEmail] = useState("")
  const [date, setDate] = useState(today)
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<EditLine[]>([emptyLine()])

  // `loading` starts true; don't setState synchronously inside the effect.
  const load = async () => {
    try {
      const res = await fetch("/api/invoices")
      if (res.ok) setInvoices(await res.json())
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const resetForm = () => {
    setCustomerName(""); setCustomerContact(""); setEmail(""); setDate(today)
    setDueDate(""); setNotes(""); setLines([emptyLine()])
  }

  const save = async () => {
    setError("")
    if (!customerName.trim()) { setError("Customer name is required."); return }
    setSaving(true)
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, customerContact, email: email || null, date, dueDate: dueDate || null, notes, items: lines }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not save invoice."); return }
      // Show a success alert and clear the form; printing is one click away.
      setSuccess({ id: data.id, number: data.number, emailed: !!data.emailed })
      resetForm()
      load()
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  return (
    <div>
      <SuccessModal
        open={!!success}
        title={`Invoice ${success?.number ?? ""} created`}
        message={success?.emailed ? "A copy has been emailed to the customer. You can print it now or close this." : "The invoice has been saved. You can print it now or close this."}
        primaryLabel="View / Print"
        onPrimary={() => { if (success) router.push(`/admin/invoicing/${success.id}?print=1`) }}
        onClose={() => setSuccess(null)}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={22} color={GREEN} />
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Invoicing</h1>
        </div>
        {canCreate && (
          <Button onClick={() => setShowForm((s) => !s)} style={{ background: GREEN, color: "white", gap: 6 }}>
            {showForm ? <><X size={16} /> Close</> : <><Plus size={16} /> New Invoice</>}
          </Button>
        )}
      </div>

      {canCreate && showForm && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          {error && <div style={{ background: "#FBEAEA", color: "#9B2C2C", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
            <Field label="Customer name *"><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></Field>
            <Field label="Phone / Email"><Input value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} /></Field>
            <Field label="Invoice date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Due date"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
            <Field label="Email invoice to"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@email.com — emailed on save" /></Field>
          </div>
          <DocLineItems lines={lines} setLines={setLines} />
          <div style={{ marginTop: 16 }}>
            <Field label="Payment details / notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. M-Pesa Paybill 123456, Acc: name" /></Field>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={save} disabled={saving} style={{ background: GREEN, color: "white", gap: 8, height: 42 }}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Printer size={16} /> Save & Print Invoice</>}
            </Button>
          </div>
        </div>
      )}

      <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <p style={{ padding: 24, color: MUTED }}>Loading…</p>
        ) : invoices.length === 0 ? (
          <p style={{ padding: 24, color: MUTED, textAlign: "center" }}>No invoices yet. Create your first one.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--admin-card-2)", fontSize: 12, color: MUTED, textAlign: "left" }}>
                <th style={th}>Number</th><th style={th}>Customer</th><th style={th}>Date</th>
                <th style={{ ...th, textAlign: "right" }}>Total</th><th style={th} />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                  <td style={{ ...td, fontWeight: 600 }}>{inv.number}</td>
                  <td style={td}>{inv.customerName}</td>
                  <td style={td}>{new Date(inv.date).toLocaleDateString("en-KE")}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{ksh(inv.total)}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Link href={`/admin/invoicing/${inv.id}`} style={{ color: GREEN, fontWeight: 600, fontSize: 13, textDecoration: "none" }}>View / Print</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: "10px 14px", fontWeight: 600 }
const td: React.CSSProperties = { padding: "10px 14px", fontSize: 13.5, color: TEXT }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: TEXT, marginBottom: 4, display: "block" }}>{label}</span>
      {children}
    </label>
  )
}
