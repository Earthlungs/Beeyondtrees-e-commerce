"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Plus, X, Loader2, Printer, BadgeCheck, Wallet } from "lucide-react"
import DocLineItems, { EditLine, emptyLine } from "@/components/admin/DocLineItems"
import { SuccessModal } from "@/components/admin/ConfirmModal"
import { isAdminishRole } from "@/lib/tracing-stages"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const ksh = (n: number) => `KSh ${n.toLocaleString()}`

const PAYMENT_METHODS = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
]

interface Invoice {
  id: string; number: string; customerName: string; date: string; total: number
  paid?: boolean; paidAt?: string | null; paidBy?: string | null
  paymentMethod?: string | null; paymentRef?: string | null
  createdByName?: string | null
  // Set by the API when the payment-tracking columns don't exist yet.
  migrationPending?: boolean
}

export default function InvoicingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || ""
  const myName = session?.user?.name || ""
  const isAdmin = isAdminishRole(role)
  const canCreate = role === "procurement_officer" || role === "external_procurement" || role === "executive" || isAdmin
  // Finance and the CEO tier reconcile the bank, so they may settle any invoice;
  // everyone else may only settle the ones they raised themselves.
  const isOverseer = isAdmin || role === "finance"
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<{ id: string; number: string; emailed: boolean } | null>(null)

  // Mark-as-paid modal state.
  const [payFor, setPayFor] = useState<Invoice | null>(null)
  const [payMethod, setPayMethod] = useState("mpesa")
  const [payRef, setPayRef] = useState("")
  const [payError, setPayError] = useState("")
  const [paying, setPaying] = useState(false)

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

  const openPay = (inv: Invoice) => {
    setPayFor(inv); setPayMethod("mpesa"); setPayRef(""); setPayError("")
  }

  const markPaid = async () => {
    if (!payFor) return
    setPayError(""); setPaying(true)
    try {
      const res = await fetch(`/api/invoices/${payFor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: true, paymentMethod: payMethod, paymentRef: payRef }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setPayError(data.error || "Could not mark this invoice paid."); return }
      setPayFor(null)
      load()
    } catch { setPayError("Network error. Try again.") }
    finally { setPaying(false) }
  }

  const migrationPending = invoices.some((i) => i.migrationPending)
  const canSettle = (inv: Invoice) =>
    !inv.migrationPending && !inv.paid && (isOverseer || (!!myName && inv.createdByName === myName))

  const totals = invoices.reduce(
    (acc, i) => {
      acc.all += i.total
      if (i.paid) acc.paid += i.total
      else acc.outstanding += i.total
      return acc
    },
    { all: 0, paid: 0, outstanding: 0 }
  )

  return (
    <div>
      <SuccessModal
        open={!!success}
        title={`Invoice ${success?.number ?? ""} created`}
        message={success?.emailed ? "A copy has been emailed to the customer. Stock has been deducted for any catalog items. You can print it now or close this." : "The invoice has been saved and stock deducted for any catalog items. You can print it now or close this."}
        primaryLabel="View / Print"
        onPrimary={() => { if (success) router.push(`/admin/invoicing/${success.id}?print=1`) }}
        onClose={() => setSuccess(null)}
      />

      {payFor && (
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget && !paying) setPayFor(null) }}
          style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--admin-card)", borderRadius: 12, width: "min(420px, 100%)", padding: 20, border: "1px solid var(--admin-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Wallet size={18} color={GREEN} />
              <h2 style={{ fontSize: 17, fontWeight: 700, color: TEXT }}>Record payment</h2>
            </div>
            <p style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>
              {payFor.number} · {payFor.customerName} · <strong style={{ color: TEXT }}>{ksh(payFor.total)}</strong>
            </p>
            {payError && <div style={{ background: "#FBEAEA", color: "#9B2C2C", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{payError}</div>}
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: TEXT, marginBottom: 4, display: "block" }}>How was it paid?</span>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                style={{ width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT, background: "var(--admin-card)" }}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
            <label style={{ display: "block", marginBottom: 18 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: TEXT, marginBottom: 4, display: "block" }}>Reference (optional)</span>
              <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="M-Pesa code, slip or cheque no." />
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <Button onClick={() => setPayFor(null)} disabled={paying} style={{ background: "var(--admin-card-2)", color: TEXT, border: "1px solid var(--admin-border)" }}>Cancel</Button>
              <Button onClick={markPaid} disabled={paying} style={{ background: GREEN, color: "white", gap: 6 }}>
                {paying ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />} Mark as Paid
              </Button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
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

      {migrationPending && (
        <div style={{ background: "var(--admin-warn-bg)", border: "1px solid var(--admin-warn-border)", color: "var(--admin-warn-fg)", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
          Payment tracking is not live yet — run <code>prisma/migrate-ops-2026-08.sql</code> on the database to enable marking invoices paid.
        </div>
      )}

      {!loading && invoices.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))", gap: 10, marginBottom: 18 }}>
          {[
            { label: "Invoiced", value: totals.all, tint: TEXT },
            { label: "Paid", value: totals.paid, tint: GREEN },
            { label: "Outstanding", value: totals.outstanding, tint: "#B0492E" },
          ].map((t) => (
            <div key={t.label} style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>{t.label}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: t.tint }}>{ksh(t.value)}</div>
            </div>
          ))}
        </div>
      )}

      {canCreate && showForm && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          {error && <div style={{ background: "#FBEAEA", color: "#9B2C2C", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12, marginBottom: 16 }}>
            <Field label="Customer name *"><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></Field>
            <Field label="Phone / Email"><Input value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} /></Field>
            <Field label="Invoice date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Due date"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
            <Field label="Email invoice to"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@email.com — emailed on save" /></Field>
          </div>
          <DocLineItems lines={lines} setLines={setLines} />
          <p style={{ fontSize: 11.5, color: MUTED, marginTop: 8 }}>
            Lines picked from the catalog (the <strong>box icon</strong>) deduct that quantity from stock when you save. Free-typed lines don&apos;t.
          </p>
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
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr style={{ background: "var(--admin-card-2)", fontSize: 12, color: MUTED, textAlign: "left" }}>
                  <th style={th}>Number</th><th style={th}>Customer</th><th style={th}>Date</th>
                  <th style={{ ...th, textAlign: "right" }}>Total</th><th style={th}>Payment</th><th style={th} />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                    <td style={{ ...td, fontWeight: 600 }}>{inv.number}</td>
                    <td style={td}>{inv.customerName}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{new Date(inv.date).toLocaleDateString("en-KE")}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600, whiteSpace: "nowrap" }}>{ksh(inv.total)}</td>
                    <td style={td}>
                      {inv.paid ? (
                        <span title={`${inv.paidBy ?? ""}${inv.paymentRef ? ` · ${inv.paymentRef}` : ""}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--admin-success-bg)", color: GREEN, border: `1px solid ${GREEN}`, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>
                          <BadgeCheck size={12} /> PAID{inv.paymentMethod ? ` · ${inv.paymentMethod}` : ""}
                        </span>
                      ) : canSettle(inv) ? (
                        <Button onClick={() => openPay(inv)} style={{ background: "var(--admin-card-2)", color: TEXT, border: "1px solid var(--admin-border)", height: 28, fontSize: 12, gap: 5, padding: "0 10px" }}>
                          <Wallet size={13} /> Mark paid
                        </Button>
                      ) : (
                        <span style={{ fontSize: 12, color: MUTED }}>Unpaid</span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <Link href={`/admin/invoicing/${inv.id}`} style={{ color: GREEN, fontWeight: 600, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}>View / Print</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
