"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, CheckCircle2, Camera } from "lucide-react"
import ImageUploader from "@/components/admin/ImageUploader"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"

interface Step {
  id: string
  label: string
  note: string | null
  percent: number
  images: unknown
  createdBy: string | null
  createdAt: string
}

const field: React.CSSProperties = {
  width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT,
}
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 4, display: "block" }

function asUrls(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string")
  if (typeof v === "string") { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] } }
  return []
}

// Production progress: a live, graphical view of the production sub-stages logged
// by the production officer (each with a completion % and photo evidence). Every
// tracing-board viewer sees the timeline + progress; only the production officer
// (or CEO) sees the logging form (canLog).
export default function ProductionProgress({ batchId, canLog }: { batchId: string; canLog: boolean }) {
  const [steps, setSteps] = useState<Step[]>([])
  const [percent, setPercent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [open, setOpen] = useState(false)
  const [f, setF] = useState<{ label: string; percent: string; note: string; images: string[] }>({ label: "", percent: "", note: "", images: [] })

  const load = async () => {
    try {
      const res = await fetch(`/api/tracing/batches/${batchId}/production-steps`)
      if (res.ok) {
        const data = await res.json()
        setSteps(data.steps ?? [])
        setPercent(data.percentComplete ?? 0)
      }
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [batchId]) // eslint-disable-line react-hooks/exhaustive-deps

  const log = async () => {
    if (!f.label.trim()) { setError("Give the step a name (e.g. Cutting, Weaving, Finishing).") ; return }
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/tracing/batches/${batchId}/production-steps`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: f.label.trim(), percent: Number(f.percent) || 0, note: f.note.trim(), images: f.images }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not save."); return }
      setSteps(data.steps ?? []); setPercent(data.percentComplete ?? 0)
      setF({ label: "", percent: "", note: "", images: [] }); setOpen(false)
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  return (
    <div style={{ marginTop: 12, background: "var(--admin-card-2)", border: "1px solid var(--admin-border)", borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>Production progress</div>
        <div style={{ fontWeight: 800, color: percent >= 100 ? GREEN : "#B8860B", fontSize: 15 }}>{percent}%{percent >= 100 ? " ✓" : ""}</div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 10, background: "var(--admin-border)", borderRadius: 999, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ width: `${percent}%`, height: "100%", background: percent >= 100 ? GREEN : "#D9A441", transition: "width .35s" }} />
      </div>

      {loading ? (
        <div style={{ color: MUTED, fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}><Loader2 size={14} className="animate-spin" /> Loading steps…</div>
      ) : steps.length === 0 ? (
        <div style={{ color: MUTED, fontSize: 13 }}>No production steps logged yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 0, position: "relative" }}>
          {steps.map((s, i) => {
            const urls = asUrls(s.images)
            return (
              <div key={s.id} style={{ display: "flex", gap: 12, paddingBottom: i === steps.length - 1 ? 0 : 14 }}>
                {/* timeline rail */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <CheckCircle2 size={18} color={GREEN} />
                  {i !== steps.length - 1 && <div style={{ width: 2, flex: 1, background: "var(--admin-border)", marginTop: 2 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, color: TEXT, fontSize: 13.5 }}>{s.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>{s.percent}%</span>
                    <span style={{ fontSize: 11, color: MUTED }}>{new Date(s.createdAt).toLocaleString("en-KE")}{s.createdBy ? ` · ${s.createdBy}` : ""}</span>
                  </div>
                  {s.note && <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{s.note}</div>}
                  {urls.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {urls.map((u, j) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={j} src={u} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 6, border: "1px solid var(--admin-border)" }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Logging form — production officer / CEO only */}
      {canLog && (
        <div style={{ marginTop: 14, borderTop: "1px dashed var(--admin-border)", paddingTop: 12 }}>
          {!open ? (
            <Button onClick={() => setOpen(true)} style={{ background: GREEN, color: "white", gap: 6, height: 36 }}>
              <Plus size={15} /> Log production step
            </Button>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Step / process</label>
                  <Input style={field} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="e.g. Cutting, Weaving, Finishing" list="prod-step-suggestions" />
                  <datalist id="prod-step-suggestions">
                    {["Material prep", "Cutting", "Shaping", "Weaving", "Assembly", "Drying", "Finishing", "Quality check", "Packaging"].map((s) => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label style={labelStyle}>% complete</label>
                  <Input style={field} type="number" min={0} max={100} value={f.percent} onChange={(e) => setF({ ...f, percent: e.target.value })} placeholder="0–100" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Note (optional)</label>
                <textarea style={{ ...field, height: 56, padding: 10 }} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="What was done at this step?" />
              </div>
              <div>
                <label style={labelStyle}><Camera size={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />Photo evidence</label>
                <ImageUploader value={f.images} onChange={(v) => setF({ ...f, images: v })} />
              </div>
              {error && <div style={{ color: "#C0392B", fontSize: 13 }}>{error}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={log} disabled={saving} style={{ background: GREEN, color: "white", gap: 6, height: 38 }}>
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Save step
                </Button>
                <Button variant="outline" onClick={() => { setOpen(false); setError("") }} disabled={saving} style={{ height: 38 }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}
      {error && !canLog && <div style={{ color: "#C0392B", fontSize: 13, marginTop: 8 }}>{error}</div>}
    </div>
  )
}
