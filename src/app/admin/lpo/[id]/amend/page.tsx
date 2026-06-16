"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Pencil, ArrowLeft, Check } from "lucide-react"
import DocLineItems, { EditLine, emptyLine, lineTotals } from "@/components/admin/DocLineItems"
import type { DocLine } from "@/lib/docs"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const TEAL = "#0F766E"
const ksh = (n: number) => `KSh ${n.toLocaleString()}`

interface LpoDetail {
  id: string; number: string; supplierName: string; shippingAddress: string | null
  purchaseRep: string | null; orderDate: string; expectedArrival: string | null
  destinationOfGoods: string | null; notes: string | null; items: DocLine[]
  subtotal: number; vat: number; total: number; status: string | null
}

function toEditLines(items: DocLine[]): EditLine[] {
  if (!Array.isArray(items) || items.length === 0) return [emptyLine()]
  return items.map((l) => ({
    description: l.description ?? "",
    qty: String(l.qty ?? 1),
    unitPrice: String(l.unitPrice ?? ""),
    taxRate: String(l.taxRate ?? 0),
  }))
}

export default function AmendLpoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [lpo, setLpo] = useState<LpoDetail | null>(null)
  const [fetching, setFetching] = useState(true)
  const [fetchError, setFetchError] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [supplierName, setSupplierName] = useState("")
  const [shippingAddress, setShippingAddress] = useState("")
  const [purchaseRep, setPurchaseRep] = useState("")
  const [orderDate, setOrderDate] = useState("")
  const [expectedArrival, setExpectedArrival] = useState("")
  const [destinationOfGoods, setDestinationOfGoods] = useState("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<EditLine[]>([emptyLine()])

  useEffect(() => {
    fetch(`/api/lpos/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found")
        return r.json()
      })
      .then((data: LpoDetail) => {
        setLpo(data)
        setSupplierName(data.supplierName ?? "")
        setShippingAddress(data.shippingAddress ?? "")
        setPurchaseRep(data.purchaseRep ?? "")
        setOrderDate(data.orderDate ? data.orderDate.slice(0, 10) : "")
        setExpectedArrival(data.expectedArrival ? data.expectedArrival.slice(0, 10) : "")
        setDestinationOfGoods(data.destinationOfGoods ?? "")
        setNotes(data.notes ?? "")
        setLines(toEditLines(data.items))
      })
      .catch(() => setFetchError("Could not load this LPO."))
      .finally(() => setFetching(false))
  }, [id])

  const save = async () => {
    setError("")
    if (!supplierName.trim()) { setError("Supplier name is required."); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/lpos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "amend",
          supplierName, shippingAddress, purchaseRep,
          orderDate, expectedArrival: expectedArrival || null,
          destinationOfGoods: destinationOfGoods || null,
          notes, items: lines,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not save."); return }
      router.push(`/admin/lpo/${id}`)
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  const { total } = lineTotals(lines)

  if (fetching) return <p style={{ padding: 40, color: MUTED }}>Loading…</p>
  if (fetchError) return (
    <div style={{ padding: 40, textAlign: "center", color: MUTED }}>
      {fetchError} <Link href="/admin/lpo" style={{ color: GREEN }}>Back</Link>
    </div>
  )

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Link href="/admin/lpo" style={{ display: "flex", alignItems: "center", color: MUTED, textDecoration: "none" }}>
          <ArrowLeft size={18} />
        </Link>
        <Pencil size={20} color={TEAL} />
        <h1 style={{ fontSize: 20, fontWeight: 800, color: TEXT }}>Amend {lpo?.number}</h1>
        <span style={{ fontSize: 12, color: "white", background: TEAL, padding: "2px 10px", borderRadius: 999, fontWeight: 700, marginLeft: 4 }}>Amended on save</span>
      </div>

      <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 24 }}>
        {error && <div style={{ background: "#FBEAEA", color: "#9B2C2C", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 14, marginBottom: 20 }}>
          <Field label="Supplier name *">
            <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
          </Field>
          <Field label="Purchase representative">
            <Input value={purchaseRep} onChange={(e) => setPurchaseRep(e.target.value)} />
          </Field>
          <Field label="Order date">
            <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          </Field>
          <Field label="Expected arrival">
            <Input type="date" value={expectedArrival} onChange={(e) => setExpectedArrival(e.target.value)} />
          </Field>
          <Field label="Shipping address">
            <Input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
          </Field>
          <Field label="Destination of goods">
            <Input value={destinationOfGoods} onChange={(e) => setDestinationOfGoods(e.target.value)} placeholder="e.g. Nairobi Warehouse" />
          </Field>
        </div>

        <DocLineItems lines={lines} setLines={setLines} />

        <div style={{ marginTop: 16 }}>
          <Field label="Payment details / notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>

        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>New total: {ksh(total)}</span>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/admin/lpo">
              <Button variant="outline" style={{ height: 42 }}>Cancel</Button>
            </Link>
            <Button onClick={save} disabled={saving} style={{ background: TEAL, color: "white", gap: 8, height: 42 }}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Check size={16} /> Save & Approve (Amended)</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: TEXT, marginBottom: 4, display: "block" }}>{label}</span>
      {children}
    </label>
  )
}
