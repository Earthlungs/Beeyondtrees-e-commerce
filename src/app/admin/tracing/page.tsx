"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Workflow, Plus, X, Loader2, ChevronRight, Search, ClipboardList } from "lucide-react"
import { STAGE_LABELS, type Stage } from "@/lib/tracing-stages"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const BROWN = "#8C6A4A"
const RED = "#C0392B"
const AMBER = "#D97706"
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

interface AvailableLpo {
  id: string
  number: string
  supplierName: string
  items: { description: string; qty: number; unitPrice: number }[]
  total: number
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

  const [availableLpos, setAvailableLpos] = useState<AvailableLpo[]>([])
  const [lpoSearch, setLpoSearch] = useState("")
  const [lpoOpen, setLpoOpen] = useState(false)
  const [selectedLpo, setSelectedLpo] = useState<AvailableLpo | null>(null)
  const lpoRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!showForm || !canCreate) return
    fetch("/api/tracing/available-lpos")
      .then((r) => r.ok ? r.json() : [])
      .then((data: AvailableLpo[]) => setAvailableLpos(data))
      .catch(() => {})
  }, [showForm, canCreate])

  // Close LPO dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (lpoRef.current && !lpoRef.current.contains(e.target as Node)) setLpoOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Sync requestedBy when session loads
  useEffect(() => {
    if (session?.user?.name && !f.requestedBy) setF((prev) => ({ ...prev, requestedBy: session.user!.name! }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.name])

  const pickLpo = (lpo: AvailableLpo) => {
    const firstItem = lpo.items?.[0]
    const itemsDesc = lpo.items?.map((i) => i.description).join(", ") || ""
    const lineCount = String(lpo.items?.length || 1)
    setSelectedLpo(lpo)
    setF((prev) => ({
      ...prev,
      materialName: firstItem?.description || prev.materialName,
      productName: itemsDesc || firstItem?.description || prev.productName,
      quantityRequested: lineCount,
    }))
    setLpoOpen(false)
    setLpoSearch("")
  }

  const clearLpo = () => {
    setSelectedLpo(null)
    setF((prev) => ({ ...prev, materialName: "", productName: "", quantityRequested: "" }))
  }

  const filteredLpos = availableLpos.filter((l) =>
    !lpoSearch.trim() ||
    l.number.toLowerCase().includes(lpoSearch.toLowerCase())
  )

  const estTotal = (Number(f.quantityRequested) || 0) * (Number(f.estimatedUnitCost) || 0)

  const create = async () => {
    setError("")
    if (!selectedLpo) { setError("Please select an approved LPO to link to this batch."); return }
    if (!f.materialName.trim()) { setError("Material name is required."); return }
    if (!f.requestedBy.trim()) { setError("Requested by is required."); return }
    setSaving(true)
    try {
      const res = await fetch("/api/tracing/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, estimatedTotalCost: estTotal, lpoId: selectedLpo.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not create batch."); return }
      router.push(`/admin/tracing/${data.id}`)
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  return (
    <div>
      <style>{`
        @keyframes lpo-pulse {
          0%, 100% { border-color: ${AMBER}; box-shadow: 0 0 0 0 ${AMBER}40; }
          50% { border-color: #F59E0B; box-shadow: 0 0 0 6px ${AMBER}20; }
        }
        .lpo-pulse { animation: lpo-pulse 1.6s ease-in-out infinite; }
      `}</style>

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

          {/* LPO Picker */}
          <div style={{ marginBottom: 16 }} ref={lpoRef}>
            <label style={{ ...label, color: AMBER, fontSize: 13 }}>
              <ClipboardList size={13} style={{ display: "inline", marginRight: 5 }} />
              Select Approved LPO * <span style={{ fontSize: 11, fontWeight: 400, color: MUTED }}>(links this batch to a purchase order)</span>
            </label>

            {selectedLpo ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F0FDF4", border: `2px solid ${GREEN}`, borderRadius: 10 }}>
                <ClipboardList size={16} color={GREEN} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: GREEN, fontSize: 13 }}>{selectedLpo.number}</div>
                  <div style={{ fontSize: 12, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedLpo.supplierName} · {selectedLpo.items?.map((i) => i.description).join(", ")} · {ksh(selectedLpo.total)}
                  </div>
                </div>
                <button type="button" onClick={clearLpo} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 4 }}>
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setLpoOpen((o) => !o)}
                  className="lpo-pulse"
                  style={{
                    width: "100%", height: 44, borderRadius: 8, border: `2px solid ${AMBER}`,
                    background: "#FFFBEB", color: MUTED, cursor: "pointer", textAlign: "left",
                    padding: "0 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                  }}>
                  <Search size={14} color={AMBER} />
                  <span>Search by LPO number…</span>
                  {availableLpos.length > 0 && (
                    <span style={{ marginLeft: "auto", background: AMBER, color: "white", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
                      {availableLpos.length} available
                    </span>
                  )}
                </button>

                {lpoOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 500, background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
                    <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--admin-border)", display: "flex", gap: 8, alignItems: "center" }}>
                      <Search size={14} color={MUTED} style={{ flexShrink: 0 }} />
                      <input
                        autoFocus
                        value={lpoSearch}
                        onChange={(e) => setLpoSearch(e.target.value)}
                        placeholder="Type LPO number…"
                        style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: TEXT }}
                      />
                    </div>
                    <div style={{ maxHeight: 280, overflowY: "auto" }}>
                      {filteredLpos.length === 0 ? (
                        <div style={{ padding: "16px 14px", fontSize: 13, color: MUTED, textAlign: "center" }}>
                          {availableLpos.length === 0 ? "No approved LPOs available — all have been used or none approved yet." : "No LPOs match your search."}
                        </div>
                      ) : filteredLpos.map((lpo) => (
                        <button
                          key={lpo.id}
                          type="button"
                          onClick={() => pickLpo(lpo)}
                          style={{ display: "block", width: "100%", padding: "11px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: "1px solid var(--admin-border)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fdf8")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, color: GREEN, fontSize: 13 }}>{lpo.number}</span>
                            <span style={{ fontSize: 12, color: MUTED }}>{ksh(lpo.total)}</span>
                          </div>
                          <div style={{ fontSize: 12, color: TEXT, marginTop: 2 }}>{lpo.supplierName}</div>
                          <div style={{ fontSize: 11, color: MUTED, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {lpo.items?.map((i) => i.description).join(" · ")}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rest of the form */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div><label style={label}>Sector</label><Input style={field} value={f.sector} onChange={(e) => setF({ ...f, sector: e.target.value })} /></div>
            <div><label style={label}>Material Category</label><Input style={field} value={f.materialCategory} onChange={(e) => setF({ ...f, materialCategory: e.target.value })} /></div>
            <div>
              <label style={label}>Material Name</label>
              <div style={{ width: "100%", minHeight: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "8px 10px", background: "var(--admin-card-2)", color: TEXT, fontSize: 13, lineHeight: 1.5, wordBreak: "break-word" }}>
                {f.materialName || <span style={{ color: MUTED }}>Auto-filled from LPO</span>}
              </div>
            </div>
            <div><label style={label}>Finished Product Name</label><Input style={field} value={f.productName} onChange={(e) => setF({ ...f, productName: e.target.value })} /></div>
            <div>
              <label style={label}>Quantity Requested</label>
              <Input style={{ ...field, background: "var(--admin-card-2)" }} value={f.quantityRequested} readOnly />
            </div>
            <div><label style={label}>Unit of Measure</label><Input style={field} value={f.unitOfMeasure} onChange={(e) => setF({ ...f, unitOfMeasure: e.target.value })} /></div>
            <div><label style={label}>Expected Date</label><Input style={field} type="date" value={f.expectedDate} onChange={(e) => setF({ ...f, expectedDate: e.target.value })} /></div>
            <div><label style={label}>Estimated Unit Cost</label><Input style={field} type="number" value={f.estimatedUnitCost} onChange={(e) => setF({ ...f, estimatedUnitCost: e.target.value })} /></div>
            <div><label style={label}>Estimated Total Cost</label><Input style={{ ...field, background: "var(--admin-card-2)" }} value={ksh(estTotal)} readOnly /></div>
            <div><label style={label}>Requested By *</label><Input style={field} value={f.requestedBy} onChange={(e) => setF({ ...f, requestedBy: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={label}>Purpose</label>
            <textarea style={{ ...field, height: 70, padding: 10 }} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} />
          </div>
          <Button onClick={create} disabled={saving || !selectedLpo} style={{ background: GREEN, color: "white", marginTop: 14, gap: 6, opacity: !selectedLpo ? 0.6 : 1 }}>
            {saving && <Loader2 size={16} className="animate-spin" />} Submit & Send for Approval
          </Button>
          {!selectedLpo && <p style={{ fontSize: 12, color: AMBER, marginTop: 8 }}>← Select an LPO above before submitting.</p>}
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
