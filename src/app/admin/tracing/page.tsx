"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Workflow, Plus, X, Loader2, ChevronRight } from "lucide-react"
import { STAGE_LABELS, type Stage } from "@/lib/tracing-stages"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const BROWN = "#8C6A4A"
const RED = "#C0392B"
const ksh = (n: number) => `KSh ${n.toLocaleString()}`

interface BatchRow {
  id: string
  code: string
  stage: Stage
  status: string
  productName: string | null
  materialName: string | null
  requestedBy: string | null
  createdAt: string
  summary: { costPerUnit: number; verdict: string } | null
}

const field: React.CSSProperties = {
  width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT,
}
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 4, display: "block" }

function statusBadge(status: string) {
  const c = status === "completed" ? GREEN : status === "rejected" ? RED : BROWN
  return (
    <span style={{ background: c, color: "white", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999, textTransform: "capitalize" }}>
      {status.replace("_", " ")}
    </span>
  )
}

export default function TracingBoard() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || "merchant"
  const isAdmin = role === "admin" || role === "it_specialist"
  const canCreate = role === "factory_manager" || role === "admin" || role === "it_specialist"

  const [rows, setRows] = useState<BatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({
    sector: "", materialCategory: "", materialName: "", productName: "",
    quantityRequested: "", unitOfMeasure: "", expectedDate: today,
    estimatedUnitCost: "", purpose: "", requestedBy: session?.user?.name || "",
  })

  const load = async () => {
    try {
      const res = await fetch("/api/tracing/batches")
      if (res.ok) setRows(await res.json())
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const estTotal = (Number(f.quantityRequested) || 0) * (Number(f.estimatedUnitCost) || 0)

  const create = async () => {
    setError("")
    if (!f.materialName.trim()) { setError("Material name is required."); return }
    if (!f.requestedBy.trim()) { setError("Requested by is required."); return }
    setSaving(true)
    try {
      const res = await fetch("/api/tracing/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, estimatedTotalCost: estTotal }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not create batch."); return }
      router.push(`/admin/tracing/${data.id}`)
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Workflow size={22} color={GREEN} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Product Tracing</h1>
            <p style={{ fontSize: 12, color: MUTED }}>Raw material → finished goods, with profit/loss reconciliation</p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => setShowForm((s) => !s)} style={{ background: GREEN, color: "white", gap: 6 }}>
            {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? "Cancel" : "New Batch"}
          </Button>
        )}
      </div>

      {showForm && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 14 }}>Bulk Request (Stage 1 — Factory Manager)</h2>
          {error && <div style={{ background: "#FDEDED", color: RED, padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div><label style={label}>Sector</label><Input style={field} value={f.sector} onChange={(e) => setF({ ...f, sector: e.target.value })} /></div>
            <div><label style={label}>Material Category</label><Input style={field} value={f.materialCategory} onChange={(e) => setF({ ...f, materialCategory: e.target.value })} /></div>
            <div><label style={label}>Material Name *</label><Input style={field} value={f.materialName} onChange={(e) => setF({ ...f, materialName: e.target.value })} /></div>
            <div><label style={label}>Finished Product Name (for profit match)</label><Input style={field} value={f.productName} onChange={(e) => setF({ ...f, productName: e.target.value })} /></div>
            <div><label style={label}>Quantity Requested</label><Input style={field} type="number" value={f.quantityRequested} onChange={(e) => setF({ ...f, quantityRequested: e.target.value })} /></div>
            <div><label style={label}>Unit of Measure</label><Input style={field} value={f.unitOfMeasure} onChange={(e) => setF({ ...f, unitOfMeasure: e.target.value })} /></div>
            <div><label style={label}>Expected Date</label><Input style={field} type="date" value={f.expectedDate} onChange={(e) => setF({ ...f, expectedDate: e.target.value })} /></div>
            {isAdmin && <div><label style={label}>Estimated Unit Cost</label><Input style={field} type="number" value={f.estimatedUnitCost} onChange={(e) => setF({ ...f, estimatedUnitCost: e.target.value })} /></div>}
            {isAdmin && <div><label style={label}>Estimated Total Cost</label><Input style={{ ...field, background: "var(--admin-card-2)" }} value={ksh(estTotal)} readOnly /></div>}
            <div><label style={label}>Requested By *</label><Input style={field} value={f.requestedBy} onChange={(e) => setF({ ...f, requestedBy: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={label}>Purpose</label>
            <textarea style={{ ...field, height: 70, padding: 10 }} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} />
          </div>
          <Button onClick={create} disabled={saving} style={{ background: GREEN, color: "white", marginTop: 14, gap: 6 }}>
            {saving && <Loader2 size={16} className="animate-spin" />} Submit & Send for Approval
          </Button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED }}>No batches yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((b) => (
            <Link key={b.id} href={`/admin/tracing/${b.id}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ minWidth: 90 }}>
                  <div style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>{b.code}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{new Date(b.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: TEXT, fontSize: 14 }}>{b.productName || b.materialName || "—"}</div>
                  <div style={{ fontSize: 12, color: MUTED }}>by {b.requestedBy || "—"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {b.status === "completed" && b.summary ? (
                    <div style={{ fontSize: 12, fontWeight: 600, color: b.summary.verdict === "loss" ? RED : GREEN }}>
                      {b.summary.verdict === "loss" ? "⚠ Loss risk" : "Profitable"} · {ksh(b.summary.costPerUnit)}/unit
                    </div>
                  ) : b.status === "completed" ? (
                    <div style={{ fontSize: 12, fontWeight: 600, color: GREEN }}>Completed</div>
                  ) : (
                    <div style={{ fontSize: 12, color: MUTED }}>Stage: <b style={{ color: TEXT }}>{STAGE_LABELS[b.stage] ?? b.stage}</b></div>
                  )}
                </div>
                {statusBadge(b.status)}
                <ChevronRight size={18} color={MUTED} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
