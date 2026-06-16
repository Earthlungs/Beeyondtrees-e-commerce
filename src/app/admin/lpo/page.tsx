"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ClipboardList, Plus, X, Loader2, Printer, Check, Ban, Eye, Pencil } from "lucide-react"
import DocLineItems, { EditLine, emptyLine } from "@/components/admin/DocLineItems"
import { ConfirmModal, PromptModal } from "@/components/admin/ConfirmModal"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const RED = "#C0392B"
const AMBER = "#B8860B"
const TEAL = "#0F766E"
const ksh = (n: number) => `KSh ${n.toLocaleString()}`

interface Lpo {
  id: string
  number: string
  supplierName: string
  orderDate: string
  total: number
  status?: string
  amended?: boolean
  rejectionReason?: string | null
}

export default function LpoPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || "merchant"
  const isAdmin = role === "admin" || role === "it_specialist"
  const [lpos, setLpos] = useState<Lpo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  // Modal states
  const [approveTarget, setApproveTarget] = useState<Lpo | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Lpo | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const today = new Date().toISOString().slice(0, 10)
  const [supplierName, setSupplierName] = useState("")
  const [shippingAddress, setShippingAddress] = useState("")
  const [purchaseRep, setPurchaseRep] = useState("")
  const [orderDate, setOrderDate] = useState(today)
  const [expectedArrival, setExpectedArrival] = useState("")
  const [destinationOfGoods, setDestinationOfGoods] = useState("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<EditLine[]>([emptyLine()])

  const load = async () => {
    try {
      const res = await fetch("/api/lpos")
      if (res.ok) setLpos(await res.json())
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    setError("")
    if (!supplierName.trim()) { setError("Supplier name is required."); return }
    setSaving(true)
    try {
      const res = await fetch("/api/lpos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierName, shippingAddress, purchaseRep, orderDate, expectedArrival: expectedArrival || null, destinationOfGoods: destinationOfGoods || null, notes, items: lines }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not save LPO."); return }
      if (data.status === "approved") {
        router.push(`/admin/lpo/${data.id}?print=1`)
      } else {
        setShowForm(false)
        setSupplierName(""); setShippingAddress(""); setPurchaseRep(""); setExpectedArrival(""); setDestinationOfGoods(""); setNotes(""); setLines([emptyLine()])
        setNotice(`${data.number} submitted for admin approval.`)
        load()
      }
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  const decide = async (lpo: Lpo, action: "approve" | "reject", reason?: string) => {
    setBusyId(lpo.id)
    try {
      const res = await fetch(`/api/lpos/${lpo.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      })
      const data = await res.json()
      if (!res.ok) { setNotice(data.error || "Could not update LPO."); return }
      setLpos((prev) => prev.map((x) => (x.id === lpo.id ? { ...x, status: data.status, amended: data.amended } : x)))
    } catch { setNotice("Network error. Try again.") }
    finally { setBusyId(null) }
  }

  const statusBadge = (l: Lpo) => {
    const s = l.status
    if (s === "approved" && l.amended) {
      return (
        <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          <span style={{ background: TEAL, color: "white", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999 }}>Approved</span>
          <span style={{ background: "#ccfbf1", color: TEAL, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999 }}>Amended</span>
        </span>
      )
    }
    const c = s === "approved" ? GREEN : s === "rejected" ? RED : AMBER
    const label = s === "approved" ? "Approved" : s === "rejected" ? "Rejected" : "Pending approval"
    return <span style={{ background: c, color: "white", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999 }}>{label}</span>
  }

  return (
    <div>
      {/* Approve confirm */}
      <ConfirmModal
        open={!!approveTarget}
        title={`Approve ${approveTarget?.number}?`}
        message={`Approve the purchase order from ${approveTarget?.supplierName}. The submitter will be able to print it.`}
        confirmLabel="Approve"
        onConfirm={() => { if (approveTarget) { decide(approveTarget, "approve"); setApproveTarget(null) } }}
        onCancel={() => setApproveTarget(null)}
      />

      {/* Reject prompt */}
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
            decide(rejectTarget, "reject", rejectReason.trim())
            setRejectTarget(null)
            setRejectReason("")
          }
        }}
        onCancel={() => { setRejectTarget(null); setRejectReason("") }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ClipboardList size={22} color={GREEN} />
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Local Purchase Orders</h1>
        </div>
        <Button onClick={() => setShowForm((s) => !s)} style={{ background: GREEN, color: "white", gap: 6 }}>
          {showForm ? <><X size={16} /> Close</> : <><Plus size={16} /> New LPO</>}
        </Button>
      </div>

      {notice && (
        <div style={{ background: "#EAF3EA", color: "#2F5D2F", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{notice}</span>
          <button onClick={() => setNotice("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#2F5D2F" }}><X size={15} /></button>
        </div>
      )}

      {!isAdmin && (
        <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 16 }}>New purchase orders are sent to an admin for approval before they can be generated or printed.</p>
      )}

      {showForm && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          {error && <div style={{ background: "#FBEAEA", color: "#9B2C2C", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
            <Field label="Supplier name *"><Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} /></Field>
            <Field label="Purchase representative"><Input value={purchaseRep} onChange={(e) => setPurchaseRep(e.target.value)} /></Field>
            <Field label="Order date"><Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} /></Field>
            <Field label="Expected arrival"><Input type="date" value={expectedArrival} onChange={(e) => setExpectedArrival(e.target.value)} /></Field>
            <Field label="Shipping address"><Input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} /></Field>
            <Field label="Destination of goods"><Input value={destinationOfGoods} onChange={(e) => setDestinationOfGoods(e.target.value)} placeholder="e.g. Nairobi Warehouse" /></Field>
          </div>
          <DocLineItems lines={lines} setLines={setLines} />
          <div style={{ marginTop: 16 }}>
            <Field label="Payment details / notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={save} disabled={saving} style={{ background: GREEN, color: "white", gap: 8, height: 42 }}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : isAdmin ? <><Printer size={16} /> Save & Print LPO</> : <><Check size={16} /> Submit for Approval</>}
            </Button>
          </div>
        </div>
      )}

      <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <p style={{ padding: 24, color: MUTED }}>Loading…</p>
        ) : lpos.length === 0 ? (
          <p style={{ padding: 24, color: MUTED, textAlign: "center" }}>No purchase orders yet. Create your first one.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--admin-card-2)", fontSize: 12, color: MUTED, textAlign: "left" }}>
                <th style={th}>Number</th><th style={th}>Supplier</th><th style={th}>Order Date</th>
                <th style={{ ...th, textAlign: "right" }}>Total</th><th style={th}>Status</th><th style={{ ...th, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {lpos.map((l) => (
                <tr key={l.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                  <td style={{ ...td, fontWeight: 600 }}>{l.number}</td>
                  <td style={td}>{l.supplierName}</td>
                  <td style={td}>{new Date(l.orderDate).toLocaleDateString("en-KE")}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{ksh(l.total)}</td>
                  <td style={td}>{l.status ? statusBadge(l) : null}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      {/* View button — always visible for admin; for non-admin only on rejected (to see reason) and approved */}
                      {(isAdmin || l.status === "approved" || l.status === "rejected") && (
                        <Link href={`/admin/lpo/${l.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#555", fontWeight: 600, fontSize: 13, textDecoration: "none", padding: "6px 12px", border: "1px solid #ddd", borderRadius: 8 }}>
                          <Eye size={13} /> View
                        </Link>
                      )}
                      {isAdmin && l.status === "pending" && (
                        <>
                          <Button
                            onClick={() => setApproveTarget(l)}
                            disabled={busyId === l.id}
                            style={{ background: GREEN, color: "white", gap: 6, fontSize: 13, height: 36, padding: "0 16px" }}>
                            <Check size={14} /> Approve
                          </Button>
                          <Link href={`/admin/lpo/${l.id}/amend`} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: TEAL, color: "white", fontSize: 13, height: 36, padding: "0 16px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
                            <Pencil size={14} /> Amend
                          </Link>
                          <Button
                            onClick={() => { setRejectTarget(l); setRejectReason("") }}
                            disabled={busyId === l.id}
                            variant="outline"
                            style={{ color: RED, borderColor: RED, gap: 6, fontSize: 13, height: 36, padding: "0 16px" }}>
                            <Ban size={14} /> Reject
                          </Button>
                        </>
                      )}
                      {!isAdmin && !l.status && (
                        <span style={{ color: AMBER, fontSize: 12.5 }}>Awaiting approval</span>
                      )}
                      {!isAdmin && l.status === "pending" && (
                        <span style={{ color: AMBER, fontSize: 12.5 }}>Awaiting approval</span>
                      )}
                      {l.status === "rejected" && !isAdmin && (
                        <span style={{ color: RED, fontSize: 12.5 }}>Rejected</span>
                      )}
                    </div>
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
