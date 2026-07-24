"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Loader2, Plus, X } from "lucide-react"
import {
  SPECIES_LABELS, HEALTH_STATUSES, ANIMAL_STATUSES, YIELD_TYPES, YIELD_TYPE_LABELS, YIELD_UNITS,
} from "@/lib/livestock-stages"
import { isAdminishRole } from "@/lib/tracing-stages"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const RED = "#C0392B"

const field: React.CSSProperties = { width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT }
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 4, display: "block" }

interface HousingOption { id: string; name: string; code: string; status: string }
interface FeedingLogRow { id: string; quantity: number; fedAt: string; feedType: { name: string; unit: string } }
interface YieldRow { id: string; type: string; quantity: number; unit: string; recordedAt: string; recordedBy: string | null }

interface Animal {
  id: string; code: string; tagId: string | null; name: string | null; species: string; breed: string | null
  sex: string; groupCount: number; dob: string | null; acquiredAt: string | null
  source: string | null; weightKg: number | null; healthStatus: string; status: string
  housing: { id: string; name: string; code: string } | null; notes: string | null
  feedingLogs: FeedingLogRow[]; yields: YieldRow[]
}

function fmtDate(v: string | null) {
  if (!v) return "—"
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-KE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const emptyYieldForm = { type: "eggs", quantity: "", unit: "kg", recordedAt: "", notes: "" }

export default function LivestockAnimalDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || "merchant"
  const canEdit = role === "livestock_manager" || isAdminishRole(role)

  const [animal, setAnimal] = useState<Animal | null>(null)
  const [housing, setHousing] = useState<HousingOption[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [showYieldForm, setShowYieldForm] = useState(false)
  const [yieldForm, setYieldForm] = useState(emptyYieldForm)
  const [yieldSaving, setYieldSaving] = useState(false)
  const [yieldError, setYieldError] = useState("")

  const load = useCallback(async () => {
    const res = await fetch(`/api/livestock/animals/${id}`)
    if (res.ok) {
      const data: Animal = await res.json()
      setAnimal(data)
      setForm({
        tagId: data.tagId ?? "", name: data.name ?? "", breed: data.breed ?? "", sex: data.sex, groupCount: String(data.groupCount),
        dob: data.dob ? data.dob.slice(0, 10) : "", acquiredAt: data.acquiredAt ? data.acquiredAt.slice(0, 10) : "",
        source: data.source ?? "", weightKg: data.weightKg?.toString() ?? "", healthStatus: data.healthStatus,
        status: data.status, housingId: data.housing?.id ?? "", notes: data.notes ?? "",
      })
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch("/api/livestock/housing").then((r) => (r.ok ? r.json() : [])).then((h: HousingOption[]) => setHousing(h.filter((x) => x.status === "active"))).catch(() => {})
  }, [])

  const save = async () => {
    setError("")
    setSaving(true)
    try {
      const res = await fetch(`/api/livestock/animals/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not save changes."); return }
      await load()
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  const recordYield = async () => {
    setYieldError("")
    if (!yieldForm.quantity || Number(yieldForm.quantity) <= 0) { setYieldError("Enter a quantity produced."); return }
    setYieldSaving(true)
    try {
      const res = await fetch("/api/livestock/yields", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...yieldForm, animalId: id }),
      })
      const data = await res.json()
      if (!res.ok) { setYieldError(data.error || "Could not record the yield."); return }
      setYieldForm(emptyYieldForm); setShowYieldForm(false)
      await load()
    } catch { setYieldError("Network error. Try again.") }
    finally { setYieldSaving(false) }
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
  if (!animal) return <div style={{ padding: 60, textAlign: "center", color: MUTED }}>Animal record not found.</div>

  return (
    <div style={{ maxWidth: 800 }}>
      <Link href="/admin/livestock" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 13, textDecoration: "none", marginBottom: 14 }}>
        <ArrowLeft size={15} /> Livestock
      </Link>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>{animal.name || animal.code}</h1>
        <p style={{ fontSize: 12, color: MUTED }}>
          {animal.name ? `${animal.code} · ` : ""}
          {SPECIES_LABELS[animal.species] ?? animal.species}{animal.tagId ? ` · Tag ${animal.tagId}` : ` · ${animal.groupCount} head`}
        </p>
      </div>

      <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        {error && <div style={{ background: "#FDEDED", color: RED, padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div>
            <label style={labelStyle}>Tag / Ring ID</label>
            <Input style={field} value={form.tagId ?? ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, tagId: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Name</label>
            <Input style={field} value={form.name ?? ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bessie" />
          </div>
          <div>
            <label style={labelStyle}>Breed</label>
            <Input style={field} value={form.breed ?? ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Sex</label>
            <select style={field} value={form.sex ?? "mixed"} disabled={!canEdit} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
              <option value="male">Male</option><option value="female">Female</option><option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Group Count</label>
            <Input style={field} type="number" min={1} value={form.groupCount ?? "1"} disabled={!canEdit || !!animal.tagId} onChange={(e) => setForm({ ...form, groupCount: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Housing</label>
            <select style={field} value={form.housingId ?? ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, housingId: e.target.value })}>
              <option value="">— unassigned —</option>
              {housing.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.code})</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Weight (kg)</label>
            <Input style={field} type="number" value={form.weightKg ?? ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Date of Birth</label>
            <Input style={field} type="date" value={form.dob ?? ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Acquired On</label>
            <Input style={field} type="date" value={form.acquiredAt ?? ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, acquiredAt: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Health Status</label>
            <select style={field} value={form.healthStatus ?? "healthy"} disabled={!canEdit} onChange={(e) => setForm({ ...form, healthStatus: e.target.value })}>
              {HEALTH_STATUSES.map((s) => <option key={s} value={s} style={{ textTransform: "capitalize" }}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={field} value={form.status ?? "active"} disabled={!canEdit} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {ANIMAL_STATUSES.map((s) => <option key={s} value={s} style={{ textTransform: "capitalize" }}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>Notes</label>
          <textarea style={{ ...field, height: 60, padding: 10 }} value={form.notes ?? ""} disabled={!canEdit} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        {canEdit && (
          <Button onClick={save} disabled={saving} style={{ background: GREEN, color: "white", marginTop: 14, gap: 6 }}>
            {saving && <Loader2 size={16} className="animate-spin" />} Save Changes
          </Button>
        )}
      </div>

      {/* ── Yield records ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Production / Yield</h2>
        {canEdit && (
          <Button onClick={() => setShowYieldForm((s) => !s)} style={{ background: GREEN, color: "white", gap: 6, height: 34, fontSize: 13 }}>
            {showYieldForm ? <X size={14} /> : <Plus size={14} />} {showYieldForm ? "Cancel" : "Record Yield"}
          </Button>
        )}
      </div>

      {showYieldForm && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          {yieldError && <div style={{ background: "#FDEDED", color: RED, padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{yieldError}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <div>
              <label style={labelStyle}>Type</label>
              <select style={field} value={yieldForm.type} onChange={(e) => setYieldForm({ ...yieldForm, type: e.target.value })}>
                {YIELD_TYPES.map((t) => <option key={t} value={t}>{YIELD_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Quantity</label><Input style={field} type="number" value={yieldForm.quantity} onChange={(e) => setYieldForm({ ...yieldForm, quantity: e.target.value })} /></div>
            <div>
              <label style={labelStyle}>Unit</label>
              <select style={field} value={yieldForm.unit} onChange={(e) => setYieldForm({ ...yieldForm, unit: e.target.value })}>
                {YIELD_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Date</label><Input style={field} type="date" value={yieldForm.recordedAt} onChange={(e) => setYieldForm({ ...yieldForm, recordedAt: e.target.value })} /></div>
          </div>
          <Button onClick={recordYield} disabled={yieldSaving} style={{ background: GREEN, color: "white", marginTop: 14, gap: 6 }}>
            {yieldSaving && <Loader2 size={16} className="animate-spin" />} Save Yield
          </Button>
        </div>
      )}

      {animal.yields.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, color: MUTED, marginBottom: 30 }}>No yield recorded yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginBottom: 30 }}>
          {animal.yields.map((y) => (
            <div key={y.id} style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: TEXT, minWidth: 90 }}>{YIELD_TYPE_LABELS[y.type] ?? y.type}</div>
              <div style={{ flex: 1, color: TEXT }}>{y.quantity} {y.unit}</div>
              <div style={{ color: MUTED }}>{fmtDate(y.recordedAt)}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Feeding history ── */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 10 }}>Recent Feeding</h2>
      {animal.feedingLogs.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, color: MUTED }}>No feeding logged for this record yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {animal.feedingLogs.map((l) => (
            <div key={l.id} style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
              <div style={{ flex: 1, color: TEXT }}>{l.feedType.name} · {l.quantity} {l.feedType.unit}</div>
              <div style={{ color: MUTED }}>{fmtDate(l.fedAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
