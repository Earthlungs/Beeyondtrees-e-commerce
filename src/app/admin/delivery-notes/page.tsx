"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PackageCheck, Plus, X, Loader2, Printer, Eye, Paperclip, Trash2 } from "lucide-react"
import ImageUploader from "@/components/admin/ImageUploader"
import { SuccessModal } from "@/components/admin/ConfirmModal"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const AMBER = "#B8860B"

interface DeliveryNote {
  id: string
  number: string
  lpoNumber: string | null
  supplierName: string
  deliveredTo: string | null
  deliveryDate: string
  receivedBy: string | null
  items: DeliveryLineRow[]
  attachmentUrl: string | null
}

// An approved LPO, as returned by /api/lpos (items included).
interface ApprovedLpo {
  id: string
  number: string
  supplierName: string
  status?: string
  destinationOfGoods?: string | null
  items: { description: string; qty: number }[]
}

interface DeliveryLineRow {
  description: string
  unit: string
  qtyOrdered: string
  qtyDelivered: string
  remarks: string
}

const emptyLine = (): DeliveryLineRow => ({ description: "", unit: "", qtyOrdered: "", qtyDelivered: "", remarks: "" })

export default function DeliveryNotesPage() {
  const router = useRouter()
  const [notes, setNotes] = useState<DeliveryNote[]>([])
  const [lpos, setLpos] = useState<ApprovedLpo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<{ id: string; number: string; emailed: boolean; email: string } | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [lpoId, setLpoId] = useState("")
  const [deliveredTo, setDeliveredTo] = useState("")
  const [deliveryDate, setDeliveryDate] = useState(today)
  const [vehicleReg, setVehicleReg] = useState("")
  const [driverName, setDriverName] = useState("")
  const [driverPhone, setDriverPhone] = useState("")
  const [receivedBy, setReceivedBy] = useState("")
  const [email, setEmail] = useState("")
  const [notesText, setNotesText] = useState("")
  const [lines, setLines] = useState<DeliveryLineRow[]>([emptyLine()])
  const [attachment, setAttachment] = useState<string[]>([])

  const selectedLpo = useMemo(() => lpos.find((l) => l.id === lpoId) ?? null, [lpos, lpoId])

  const load = async () => {
    try {
      const [dnRes, lpoRes] = await Promise.all([fetch("/api/delivery-notes"), fetch("/api/lpos")])
      if (dnRes.ok) setNotes(await dnRes.json())
      if (lpoRes.ok) {
        const all: ApprovedLpo[] = await lpoRes.json()
        // Goods only move against a fully approved LPO — the API enforces this
        // too, this just keeps unapprovable orders out of the picker.
        setLpos(all.filter((l) => l.status === "approved"))
      }
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  // Picking an LPO pre-fills the consignment from what was ordered: destination
  // and one line per LPO item, defaulting to a full delivery. Everything stays
  // editable — short deliveries are the normal case.
  const pickLpo = (id: string) => {
    setLpoId(id)
    const lpo = lpos.find((l) => l.id === id)
    if (!lpo) return
    setDeliveredTo(lpo.destinationOfGoods || "")
    const items = Array.isArray(lpo.items) ? lpo.items : []
    setLines(items.length > 0
      ? items.map((it) => ({
          description: it.description,
          unit: "",
          qtyOrdered: String(it.qty ?? 0),
          qtyDelivered: String(it.qty ?? 0),
          remarks: "",
        }))
      : [emptyLine()])
  }

  const resetForm = () => {
    setLpoId(""); setDeliveredTo(""); setDeliveryDate(today); setVehicleReg("")
    setDriverName(""); setDriverPhone(""); setReceivedBy(""); setEmail(""); setNotesText("")
    setLines([emptyLine()]); setAttachment([])
  }

  const updateLine = (i: number, patch: Partial<DeliveryLineRow>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))

  const save = async () => {
    setError("")
    if (!lpoId) { setError("Choose the approved LPO this delivery is against."); return }
    if (!lines.some((l) => l.description.trim())) { setError("Add at least one line item."); return }
    setSaving(true)
    try {
      const res = await fetch("/api/delivery-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lpoId, deliveredTo, deliveryDate, vehicleReg, driverName, driverPhone,
          receivedBy, email: email || null, notes: notesText,
          items: lines, attachmentUrl: attachment[0] || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not save the delivery note."); return }
      setSuccess({ id: data.id, number: data.number, emailed: !!data.emailed, email })
      resetForm()
      load()
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  return (
    <div>
      <SuccessModal
        open={!!success}
        title={`Delivery Note ${success?.number} created`}
        message={success?.emailed
          ? `A copy has been emailed to ${success.email}. Print it to travel with the goods.`
          : "Print it to travel with the goods, and have the recipient sign on delivery."}
        primaryLabel="View / Print"
        onPrimary={() => { if (success) router.push(`/admin/delivery-notes/${success.id}?print=1`) }}
        onClose={() => setSuccess(null)}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PackageCheck size={22} color={GREEN} />
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Delivery Notes</h1>
        </div>
        <Button onClick={() => setShowForm((s) => !s)} style={{ background: GREEN, color: "white", gap: 6 }}>
          {showForm ? <><X size={16} /> Close</> : <><Plus size={16} /> New Delivery Note</>}
        </Button>
      </div>

      <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 16 }}>
        Raised against an approved LPO and printable straight away — no approval step, so the note can travel with the goods.
      </p>

      {showForm && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: "16px clamp(12px, 4vw, 20px)", marginBottom: 24, overflowX: "hidden" }}>
          {error && <div style={{ background: "#FBEAEA", color: "#9B2C2C", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <Field label="Against LPO *">
            <select
              value={lpoId}
              onChange={(e) => pickLpo(e.target.value)}
              style={{ width: "100%", height: 40, padding: "0 10px", border: "1px solid var(--admin-border)", borderRadius: 8, fontSize: 14, background: "var(--admin-card)", color: TEXT }}>
              <option value="">Select an approved LPO…</option>
              {lpos.map((l) => (
                <option key={l.id} value={l.id}>{l.number} — {l.supplierName}</option>
              ))}
            </select>
          </Field>
          {lpos.length === 0 && !loading && (
            <p style={{ fontSize: 12.5, color: AMBER, marginTop: 6 }}>No approved LPOs yet — a purchase order must clear final approval before goods can be delivered against it.</p>
          )}
          {selectedLpo && (
            <p style={{ fontSize: 12.5, color: MUTED, marginTop: 6 }}>Supplier: <strong style={{ color: TEXT }}>{selectedLpo.supplierName}</strong> — carried onto the note from {selectedLpo.number}.</p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12, margin: "16px 0" }}>
            <Field label="Delivered to"><Input value={deliveredTo} onChange={(e) => setDeliveredTo(e.target.value)} placeholder="e.g. Nairobi Warehouse" /></Field>
            <Field label="Delivery date"><Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></Field>
            <Field label="Vehicle / registration"><Input value={vehicleReg} onChange={(e) => setVehicleReg(e.target.value)} placeholder="e.g. KDA 123X" /></Field>
            <Field label="Driver name"><Input value={driverName} onChange={(e) => setDriverName(e.target.value)} /></Field>
            <Field label="Driver phone"><Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} /></Field>
            <Field label="Received by"><Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder="Who signs for the goods" /></Field>
            <Field label="Email delivery note to"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="supplier@email.com — sent on save" /></Field>
          </div>

          {/* Quantities only — the LPO carries the pricing. */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr style={{ fontSize: 12, color: MUTED, textAlign: "left" }}>
                  <th style={{ padding: "4px 8px", minWidth: 160 }}>Description</th>
                  <th style={{ padding: "4px 8px", width: 80 }}>Unit</th>
                  <th style={{ padding: "4px 8px", width: 90 }}>Ordered</th>
                  <th style={{ padding: "4px 8px", width: 90 }}>Delivered</th>
                  <th style={{ padding: "4px 8px", minWidth: 130 }}>Remarks</th>
                  <th style={{ width: 28 }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td style={{ padding: 3 }}><input style={cell} value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} placeholder="Item" /></td>
                    <td style={{ padding: 3 }}><input style={cell} value={l.unit} onChange={(e) => updateLine(i, { unit: e.target.value })} placeholder="pcs" /></td>
                    <td style={{ padding: 3 }}><input style={cell} type="number" min="0" value={l.qtyOrdered} onChange={(e) => updateLine(i, { qtyOrdered: e.target.value })} /></td>
                    <td style={{ padding: 3 }}><input style={cell} type="number" min="0" value={l.qtyDelivered} onChange={(e) => updateLine(i, { qtyDelivered: e.target.value })} /></td>
                    <td style={{ padding: 3 }}><input style={cell} value={l.remarks} onChange={(e) => updateLine(i, { remarks: e.target.value })} placeholder="e.g. 2 bags torn" /></td>
                    <td style={{ textAlign: "center" }}>
                      {lines.length > 1 && (
                        <button type="button" onClick={() => removeLine(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8C6A4A" }}><Trash2 size={15} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => setLines([...lines, emptyLine()])}
            style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${GREEN}`, color: GREEN, borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Plus size={14} /> Add line
          </button>

          <div style={{ marginTop: 16 }}>
            <Field label="Attach image or PDF (signed copy / photo of goods)">
              <ImageUploader value={attachment} onChange={setAttachment} single allowPdf />
            </Field>
          </div>
          <div style={{ marginTop: 16 }}>
            <Field label="Notes"><Input value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="Condition of goods, handover instructions, etc." /></Field>
          </div>

          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={save} disabled={saving} style={{ background: GREEN, color: "white", gap: 8, height: 42 }}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Printer size={16} /> Save & Print Delivery Note</>}
            </Button>
          </div>
        </div>
      )}

      <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <p style={{ padding: 24, color: MUTED }}>Loading…</p>
        ) : notes.length === 0 ? (
          <p style={{ padding: 24, color: MUTED, textAlign: "center" }}>No delivery notes yet. Create one against an approved LPO.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: "var(--admin-card-2)", fontSize: 12, color: MUTED, textAlign: "left" }}>
                  <th style={th}>Number</th><th style={th}>Against LPO</th><th style={th}>Supplier</th>
                  <th style={th}>Delivered To</th><th style={th}>Date</th><th style={{ ...th, textAlign: "right" }} />
                </tr>
              </thead>
              <tbody>
                {notes.map((n) => (
                  <tr key={n.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                    <td style={{ ...td, fontWeight: 600 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        {n.number}
                        {n.attachmentUrl && <Paperclip size={12} color={MUTED} aria-label="Has attachment" />}
                      </span>
                    </td>
                    <td style={td}>{n.lpoNumber || "—"}</td>
                    <td style={td}>{n.supplierName}</td>
                    <td style={td}>{n.deliveredTo || "—"}</td>
                    <td style={td}>{new Date(n.deliveryDate).toLocaleDateString("en-KE")}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <Link href={`/admin/delivery-notes/${n.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#555", fontWeight: 600, fontSize: 13, textDecoration: "none", padding: "6px 12px", border: "1px solid #ddd", borderRadius: 8 }}>
                        <Eye size={13} /> View
                      </Link>
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
const cell: React.CSSProperties = { padding: "6px 8px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 13, width: "100%", background: "white", color: "#4A3F2F" }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: TEXT, marginBottom: 4, display: "block" }}>{label}</span>
      {children}
    </label>
  )
}
