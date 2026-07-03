"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollText, Plus, X, Loader2, Printer, Check, Ban, Eye, Pencil, Paperclip } from "lucide-react"
import DocLineItems, { EditLine, emptyLine } from "@/components/admin/DocLineItems"
import ImageUploader from "@/components/admin/ImageUploader"
import { ConfirmModal, PromptModal, SuccessModal } from "@/components/admin/ConfirmModal"
import { isAdminishRole } from "@/lib/tracing-stages"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const RED = "#C0392B"
const AMBER = "#B8860B"
const TEAL = "#0F766E"
const ksh = (n: number) => `KSh ${n.toLocaleString()}`

interface Quotation {
  id: string
  number: string
  supplierName: string
  orderDate: string
  total: number
  status?: string
  amended?: boolean
  rejectionReason?: string | null
  origin?: string | null
  onBehalf?: boolean
  createdByName?: string | null
  attachmentUrl?: string | null
}

// Quotation board — the LPO flow without payment details. Same originators and
// two-lane approval chain (Factory Admin or Chief → CEO).
export default function QuotationsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || "merchant"
  const isAdmin = isAdminishRole(role)
  const isExec = role === "executive"
  const isChief = role === "chief"
  const canCreate = role === "procurement_officer" || role === "external_procurement" || isExec || isAdmin
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [success, setSuccess] = useState<{ id: string; number: string; approved: boolean; emailed: boolean; email: string } | null>(null)

  const [approveTarget, setApproveTarget] = useState<Quotation | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Quotation | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const today = new Date().toISOString().slice(0, 10)
  const [supplierName, setSupplierName] = useState("")
  const [shippingAddress, setShippingAddress] = useState("")
  const [purchaseRep, setPurchaseRep] = useState("")
  const [orderDate, setOrderDate] = useState(today)
  const [expectedArrival, setExpectedArrival] = useState("")
  const [destinationOfGoods, setDestinationOfGoods] = useState("")
  const [email, setEmail] = useState("")
  const [lines, setLines] = useState<EditLine[]>([emptyLine()])
  const [attachment, setAttachment] = useState<string[]>([])

  const load = async () => {
    try {
      const res = await fetch("/api/quotations")
      if (res.ok) setQuotations(await res.json())
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const resetForm = () => {
    setSupplierName(""); setShippingAddress(""); setPurchaseRep(""); setOrderDate(today)
    setExpectedArrival(""); setDestinationOfGoods(""); setEmail(""); setLines([emptyLine()])
    setAttachment([])
  }

  const save = async () => {
    setError("")
    if (!supplierName.trim()) { setError("Supplier name is required."); return }
    setSaving(true)
    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierName, shippingAddress, purchaseRep, orderDate, expectedArrival: expectedArrival || null, destinationOfGoods: destinationOfGoods || null, email: email || null, items: lines, attachmentUrl: attachment[0] || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not save quotation."); return }
      setSuccess({ id: data.id, number: data.number, approved: data.status === "approved", emailed: !!data.emailed, email })
      resetForm()
      load()
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  const decide = async (q: Quotation, action: "exec_approve" | "exec_amend" | "chief_approve" | "chief_reject" | "approve" | "reject", reason?: string) => {
    setBusyId(q.id)
    try {
      const res = await fetch(`/api/quotations/${q.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      })
      const data = await res.json()
      if (!res.ok) { setNotice(data.error || "Could not update quotation."); return }
      setQuotations((prev) => prev.map((x) => (x.id === q.id ? { ...x, status: data.status, amended: data.amended } : x)))
    } catch { setNotice("Network error. Try again.") }
    finally { setBusyId(null) }
  }

  const pill = (bg: string, text: string, color = "white") => (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999 }}>{text}</span>
  )
  const originChip = (q: Quotation) =>
    q.origin === "external"
      ? <span style={{ background: "#8C6A4A", color: "white", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.4 }}>External</span>
      : q.origin === "internal"
        ? <span style={{ background: "#6B7D5C", color: "white", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.4 }}>Internal</span>
        : null

  const statusBadge = (q: Quotation) => {
    const s = q.status
    return (
      <span style={{ display: "inline-flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
        {originChip(q)}
        {s === "approved" && pill(GREEN, "Approved")}
        {s === "approved" && q.onBehalf && pill("#ede9fe", "Approved on behalf", "#6d28d9")}
        {s === "approved" && q.amended && <span style={{ background: "#ccfbf1", color: TEAL, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999 }}>Amended</span>}
        {s === "exec_approved" && pill(TEAL, "Factory Admin Approved")}
        {s === "chief_approved" && pill(TEAL, "Chief Approved")}
        {s === "pending_chief" && pill(AMBER, "Awaiting Chief")}
        {s === "rejected" && pill(RED, "Rejected")}
        {(s === "pending" || !s) && pill(AMBER, "Awaiting Factory Admin")}
      </span>
    )
  }

  return (
    <div>
      <SuccessModal
        open={!!success}
        title={success?.approved ? `Quotation ${success?.number} created` : `Quotation ${success?.number} submitted`}
        message={
          success?.approved
            ? (success.emailed ? `A copy has been emailed to ${success.email}. You can print it now or close this.` : "The quotation is approved and ready. You can print it now or close this.")
            : `It has been sent for admin approval.${success?.email ? ` It will be emailed to ${success.email} once approved.` : ""}`
        }
        primaryLabel={success?.approved ? "View / Print" : undefined}
        onPrimary={success?.approved ? () => { if (success) router.push(`/admin/quotations/${success.id}?print=1`) } : undefined}
        onClose={() => setSuccess(null)}
      />

      <ConfirmModal
        open={!!approveTarget}
        title={`Approve ${approveTarget?.number}?`}
        message={isExec
          ? `Forward this quotation to the CEO for final approval.`
          : isChief
            ? `Approve this external (Bamboosa) quotation and forward it to the CEO for final approval.`
            : `Give final approval to this quotation from ${approveTarget?.supplierName}. It will become printable.`}
        confirmLabel="Approve"
        onConfirm={() => {
          if (approveTarget) {
            const action = approveTarget.status === "pending_chief" ? "chief_approve"
              : approveTarget.status === "pending" ? "exec_approve"
              : "approve"
            decide(approveTarget, action)
            setApproveTarget(null)
          }
        }}
        onCancel={() => setApproveTarget(null)}
      />

      <PromptModal
        open={!!rejectTarget}
        title={`Reject ${rejectTarget?.number}?`}
        message="Enter a reason for rejection — the submitter will see this."
        placeholder="Enter rejection reason…"
        confirmLabel="Reject"
        value={rejectReason}
        onChange={setRejectReason}
        onConfirm={() => {
          if (rejectTarget && rejectReason.trim()) {
            const action = rejectTarget.status === "pending_chief" ? "chief_reject" : "reject"
            decide(rejectTarget, action, rejectReason.trim())
            setRejectTarget(null)
            setRejectReason("")
          }
        }}
        onCancel={() => { setRejectTarget(null); setRejectReason("") }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ScrollText size={22} color={GREEN} />
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Quotations</h1>
        </div>
        {canCreate && (
          <Button onClick={() => setShowForm((s) => !s)} style={{ background: GREEN, color: "white", gap: 6 }}>
            {showForm ? <><X size={16} /> Close</> : <><Plus size={16} /> New Quotation</>}
          </Button>
        )}
      </div>

      {notice && (
        <div style={{ background: "#EAF3EA", color: "#2F5D2F", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{notice}</span>
          <button onClick={() => setNotice("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#2F5D2F" }}><X size={15} /></button>
        </div>
      )}

      {canCreate && !isAdmin && (
        <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 16 }}>New quotations are sent to an admin for approval before they can be generated or printed.</p>
      )}

      {canCreate && showForm && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: "16px clamp(12px, 4vw, 20px)", marginBottom: 24, overflowX: "hidden" }}>
          {error && <div style={{ background: "#FBEAEA", color: "#9B2C2C", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12, marginBottom: 16 }}>
            <Field label="Supplier name *"><Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} /></Field>
            <Field label="Purchase representative"><Input value={purchaseRep} onChange={(e) => setPurchaseRep(e.target.value)} /></Field>
            <Field label="Date"><Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} /></Field>
            <Field label="Expected arrival"><Input type="date" value={expectedArrival} onChange={(e) => setExpectedArrival(e.target.value)} /></Field>
            <Field label="Source of supply"><Input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} /></Field>
            <Field label="Destination of goods"><Input value={destinationOfGoods} onChange={(e) => setDestinationOfGoods(e.target.value)} placeholder="e.g. Nairobi Warehouse" /></Field>
            <Field label="Email quotation to"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="supplier@email.com — emailed when approved" /></Field>
          </div>
          <DocLineItems lines={lines} setLines={setLines} />
          <div style={{ marginTop: 16 }}>
            <Field label="Attach image or PDF (supplier quote / spec / photo)">
              <ImageUploader value={attachment} onChange={setAttachment} single allowPdf />
            </Field>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={save} disabled={saving} style={{ background: GREEN, color: "white", gap: 8, height: 42 }}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : isAdmin ? <><Printer size={16} /> Save & Print Quotation</> : <><Check size={16} /> Submit for Approval</>}
            </Button>
          </div>
        </div>
      )}

      <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <p style={{ padding: 24, color: MUTED }}>Loading…</p>
        ) : quotations.length === 0 ? (
          <p style={{ padding: 24, color: MUTED, textAlign: "center" }}>No quotations yet. Create your first one.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ background: "var(--admin-card-2)", fontSize: 12, color: MUTED, textAlign: "left" }}>
                <th style={th}>Number</th><th style={th}>Supplier</th><th style={th}>Date</th>
                <th style={{ ...th, textAlign: "right" }}>Total</th><th style={th}>Status</th><th style={{ ...th, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                  <td style={{ ...td, fontWeight: 600 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      {q.number}
                      {q.attachmentUrl && <Paperclip size={12} color={MUTED} aria-label="Has attachment" />}
                    </span>
                  </td>
                  <td style={td}>{q.supplierName}</td>
                  <td style={td}>{new Date(q.orderDate).toLocaleDateString("en-KE")}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{ksh(q.total)}</td>
                  <td style={td}>{q.status ? statusBadge(q) : null}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      {(isAdmin || isExec || isChief || q.status === "approved" || q.status === "rejected") && (
                        <Link href={`/admin/quotations/${q.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#555", fontWeight: 600, fontSize: 13, textDecoration: "none", padding: "6px 12px", border: "1px solid #ddd", borderRadius: 8 }}>
                          <Eye size={13} /> View
                        </Link>
                      )}

                      {isExec && q.status === "pending" && (
                        <>
                          <Button
                            onClick={() => setApproveTarget(q)}
                            disabled={busyId === q.id}
                            style={{ background: TEAL, color: "white", gap: 6, fontSize: 13, height: 36, padding: "0 16px" }}>
                            <Check size={14} /> Approve
                          </Button>
                          <Link href={`/admin/quotations/${q.id}/amend`} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#8C6A4A", color: "white", fontSize: 13, height: 36, padding: "0 16px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
                            <Pencil size={14} /> Amend
                          </Link>
                        </>
                      )}

                      {isChief && q.status === "pending_chief" && (
                        <>
                          <Button
                            onClick={() => setApproveTarget(q)}
                            disabled={busyId === q.id}
                            style={{ background: TEAL, color: "white", gap: 6, fontSize: 13, height: 36, padding: "0 16px" }}>
                            <Check size={14} /> Approve
                          </Button>
                          <Button
                            onClick={() => { setRejectTarget(q); setRejectReason("") }}
                            disabled={busyId === q.id}
                            variant="outline"
                            style={{ color: RED, borderColor: RED, gap: 6, fontSize: 13, height: 36, padding: "0 16px" }}>
                            <Ban size={14} /> Reject
                          </Button>
                        </>
                      )}

                      {isAdmin && (q.status === "exec_approved" || q.status === "chief_approved") && (
                        <>
                          <Button
                            onClick={() => setApproveTarget(q)}
                            disabled={busyId === q.id}
                            style={{ background: GREEN, color: "white", gap: 6, fontSize: 13, height: 36, padding: "0 16px" }}>
                            <Check size={14} /> Approve
                          </Button>
                          <Button
                            onClick={() => { setRejectTarget(q); setRejectReason("") }}
                            disabled={busyId === q.id}
                            variant="outline"
                            style={{ color: RED, borderColor: RED, gap: 6, fontSize: 13, height: 36, padding: "0 16px" }}>
                            <Ban size={14} /> Reject
                          </Button>
                        </>
                      )}

                      {!isAdmin && !isExec && !isChief && (q.status === "pending" || !q.status) && (
                        <span style={{ color: AMBER, fontSize: 12.5 }}>Awaiting Factory Admin</span>
                      )}
                      {!isAdmin && !isExec && !isChief && q.status === "pending_chief" && (
                        <span style={{ color: AMBER, fontSize: 12.5 }}>Awaiting Chief</span>
                      )}
                      {!isAdmin && !isExec && !isChief && (q.status === "exec_approved" || q.status === "chief_approved") && (
                        <span style={{ color: TEAL, fontSize: 12.5 }}>Awaiting CEO approval</span>
                      )}
                      {!isAdmin && !isExec && !isChief && q.status === "rejected" && (
                        <span style={{ color: RED, fontSize: 12.5 }}>Rejected</span>
                      )}
                    </div>
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
