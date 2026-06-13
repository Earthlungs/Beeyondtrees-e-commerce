"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ClipboardList, Plus, X, Loader2, Printer } from "lucide-react"
import DocLineItems, { EditLine, emptyLine } from "@/components/admin/DocLineItems"

const TEXT = "#4A3F2F"
const MUTED = "#A89F91"
const GREEN = "#6B7D5C"
const ksh = (n: number) => `KSh ${n.toLocaleString()}`

interface Lpo {
  id: string; number: string; supplierName: string; orderDate: string; total: number
}

export default function LpoPage() {
  const router = useRouter()
  const [lpos, setLpos] = useState<Lpo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const today = new Date().toISOString().slice(0, 10)
  const [supplierName, setSupplierName] = useState("")
  const [shippingAddress, setShippingAddress] = useState("")
  const [purchaseRep, setPurchaseRep] = useState("")
  const [orderDate, setOrderDate] = useState(today)
  const [expectedArrival, setExpectedArrival] = useState("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<EditLine[]>([emptyLine()])

  // `loading` starts true; don't setState synchronously inside the effect.
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
        body: JSON.stringify({ supplierName, shippingAddress, purchaseRep, orderDate, expectedArrival: expectedArrival || null, notes, items: lines }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not save LPO."); return }
      router.push(`/admin/lpo/${data.id}?print=1`)
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ClipboardList size={22} color={GREEN} />
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Local Purchase Orders</h1>
        </div>
        <Button onClick={() => setShowForm((s) => !s)} style={{ background: GREEN, color: "white", gap: 6 }}>
          {showForm ? <><X size={16} /> Close</> : <><Plus size={16} /> New LPO</>}
        </Button>
      </div>

      {showForm && (
        <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          {error && <div style={{ background: "#FBEAEA", color: "#9B2C2C", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
            <Field label="Supplier name *"><Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} /></Field>
            <Field label="Purchase representative"><Input value={purchaseRep} onChange={(e) => setPurchaseRep(e.target.value)} /></Field>
            <Field label="Order date"><Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} /></Field>
            <Field label="Expected arrival"><Input type="date" value={expectedArrival} onChange={(e) => setExpectedArrival(e.target.value)} /></Field>
            <Field label="Shipping address"><Input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} /></Field>
          </div>
          <DocLineItems lines={lines} setLines={setLines} />
          <div style={{ marginTop: 16 }}>
            <Field label="Payment details / notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={save} disabled={saving} style={{ background: GREEN, color: "white", gap: 8, height: 42 }}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Printer size={16} /> Save & Print LPO</>}
            </Button>
          </div>
        </div>
      )}

      <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <p style={{ padding: 24, color: MUTED }}>Loading…</p>
        ) : lpos.length === 0 ? (
          <p style={{ padding: 24, color: MUTED, textAlign: "center" }}>No purchase orders yet. Create your first one.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAF8F3", fontSize: 12, color: MUTED, textAlign: "left" }}>
                <th style={th}>Number</th><th style={th}>Supplier</th><th style={th}>Order Date</th>
                <th style={{ ...th, textAlign: "right" }}>Total</th><th style={th} />
              </tr>
            </thead>
            <tbody>
              {lpos.map((l) => (
                <tr key={l.id} style={{ borderTop: "1px solid #F0EDE6" }}>
                  <td style={{ ...td, fontWeight: 600 }}>{l.number}</td>
                  <td style={td}>{l.supplierName}</td>
                  <td style={td}>{new Date(l.orderDate).toLocaleDateString("en-KE")}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{ksh(l.total)}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Link href={`/admin/lpo/${l.id}`} style={{ color: GREEN, fontWeight: 600, fontSize: 13, textDecoration: "none" }}>View / Print</Link>
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
