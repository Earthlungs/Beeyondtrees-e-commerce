"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PawPrint, Plus, X, Loader2, ChevronRight, Warehouse, Wheat, BarChart3 } from "lucide-react"
import { SPECIES, SPECIES_LABELS } from "@/lib/livestock-stages"
import { isAdminishRole } from "@/lib/tracing-stages"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const RED = "#C0392B"
const AMBER = "#D9A441"

const field: React.CSSProperties = { width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT }
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 4, display: "block" }

interface HousingOption { id: string; name: string; code: string; status: string }

interface AnimalRow {
  id: string
  code: string
  tagId: string | null
  species: string
  breed: string | null
  sex: string
  groupCount: number
  healthStatus: string
  status: string
  weightKg: number | null
  housing: { id: string; name: string; code: string } | null
  createdAt: string
}

const emptyForm = {
  species: "cattle", tagId: "", breed: "", sex: "mixed", groupCount: "1",
  dob: "", acquiredAt: "", source: "", weightKg: "", housingId: "", notes: "",
}

function healthColor(status: string) {
  if (status === "healthy") return GREEN
  if (status === "sick" || status === "quarantine") return AMBER
  return RED
}

export default function LivestockBoard() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || "merchant"
  const canCreate = role === "livestock_manager" || isAdminishRole(role)

  const [animals, setAnimals] = useState<AnimalRow[]>([])
  const [housing, setHousing] = useState<HousingOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState(emptyForm)
  const [speciesFilter, setSpeciesFilter] = useState("")

  const load = async () => {
    try {
      const [aRes, hRes] = await Promise.all([fetch("/api/livestock/animals"), fetch("/api/livestock/housing")])
      if (aRes.ok) setAnimals(await aRes.json())
      if (hRes.ok) setHousing((await hRes.json()).filter((h: HousingOption) => h.status === "active"))
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    setError("")
    if (form.tagId.trim() && Number(form.groupCount) > 1) {
      setError("An individually tagged animal must have a group count of 1.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/livestock/animals", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not create the animal record."); return }
      setForm(emptyForm)
      setShowForm(false)
      router.push(`/admin/livestock/${data.id}`)
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  const total = animals.reduce((s, a) => s + (a.status === "active" ? a.groupCount : 0), 0)
  const sick = animals.filter((a) => a.status === "active" && (a.healthStatus === "sick" || a.healthStatus === "quarantine")).length
  const rows = speciesFilter ? animals.filter((a) => a.species === speciesFilter) : animals

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PawPrint size={22} color={GREEN} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Livestock</h1>
            <p style={{ fontSize: 12, color: MUTED }}>Animals, herds &amp; flocks — housing, feed, health, and production</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/livestock/housing" style={{ textDecoration: "none" }}>
            <Button style={{ background: "var(--admin-card-2)", color: TEXT, border: "1px solid var(--admin-border)", height: 34, fontSize: 13, gap: 6 }}>
              <Warehouse size={14} /> Housing
            </Button>
          </Link>
          <Link href="/admin/livestock/feed" style={{ textDecoration: "none" }}>
            <Button style={{ background: "var(--admin-card-2)", color: TEXT, border: "1px solid var(--admin-border)", height: 34, fontSize: 13, gap: 6 }}>
              <Wheat size={14} /> Feed
            </Button>
          </Link>
          <Link href="/admin/livestock/reports" style={{ textDecoration: "none" }}>
            <Button style={{ background: "var(--admin-card-2)", color: TEXT, border: "1px solid var(--admin-border)", height: 34, fontSize: 13, gap: 6 }}>
              <BarChart3 size={14} /> Reports
            </Button>
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, textTransform: "uppercase" }}>Total Head (active)</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: TEXT }}>{total}</div>
        </div>
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, textTransform: "uppercase" }}>Records</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: TEXT }}>{animals.length}</div>
        </div>
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, textTransform: "uppercase" }}>Sick / Quarantine</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: sick > 0 ? AMBER : TEXT }}>{sick}</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Animal &amp; Herd Records</h2>
          <select style={{ ...field, width: "auto", height: 30, fontSize: 12 }} value={speciesFilter} onChange={(e) => setSpeciesFilter(e.target.value)}>
            <option value="">All species</option>
            {SPECIES.map((s) => <option key={s} value={s}>{SPECIES_LABELS[s]}</option>)}
          </select>
        </div>
        {canCreate && (
          <Button onClick={() => setShowForm((s) => !s)} style={{ background: GREEN, color: "white", gap: 6, height: 34, fontSize: 13 }}>
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Cancel" : "New Animal / Herd Record"}
          </Button>
        )}
      </div>

      {showForm && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          {error && <div style={{ background: "#FDEDED", color: RED, padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div>
              <label style={label}>Species</label>
              <select style={field} value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })}>
                {SPECIES.map((s) => <option key={s} value={s}>{SPECIES_LABELS[s]}</option>)}
              </select>
            </div>
            <div><label style={label}>Breed</label><Input style={field} value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} /></div>
            <div>
              <label style={label}>Sex</label>
              <select style={field} value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                <option value="male">Male</option><option value="female">Female</option><option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label style={label}>Tag / Ring ID <span style={{ fontWeight: 400 }}>(individual animal only)</span></label>
              <Input style={field} value={form.tagId} onChange={(e) => setForm({ ...form, tagId: e.target.value })} placeholder="leave blank for a herd/flock record" />
            </div>
            <div>
              <label style={label}>Group Count</label>
              <Input style={field} type="number" min={1} value={form.groupCount} onChange={(e) => setForm({ ...form, groupCount: e.target.value })} disabled={!!form.tagId.trim()} />
            </div>
            <div>
              <label style={label}>Housing</label>
              <select style={field} value={form.housingId} onChange={(e) => setForm({ ...form, housingId: e.target.value })}>
                <option value="">— unassigned —</option>
                {housing.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.code})</option>)}
              </select>
            </div>
            <div><label style={label}>Date of Birth</label><Input style={field} type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
            <div><label style={label}>Acquired On</label><Input style={field} type="date" value={form.acquiredAt} onChange={(e) => setForm({ ...form, acquiredAt: e.target.value })} /></div>
            <div>
              <label style={label}>Source</label>
              <select style={field} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                <option value="">— not set —</option>
                <option value="purchased">Purchased</option>
                <option value="born_on_site">Born on Site</option>
                <option value="donated">Donated</option>
              </select>
            </div>
            <div><label style={label}>Weight (kg)</label><Input style={field} type="number" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={label}>Notes</label>
            <textarea style={{ ...field, height: 60, padding: 10 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button onClick={create} disabled={saving} style={{ background: GREEN, color: "white", marginTop: 14, gap: 6 }}>
            {saving && <Loader2 size={16} className="animate-spin" />} Create Record
          </Button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED }}>No animal or herd records yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((a) => (
            <Link key={a.id} href={`/admin/livestock/${a.id}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ minWidth: 110 }}>
                  <div style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>{a.code}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{a.tagId ? `Tag ${a.tagId}` : `${a.groupCount} head`}</div>
                </div>
                <div style={{ flex: 1, minWidth: 160, fontSize: 13, color: TEXT }}>
                  {SPECIES_LABELS[a.species] ?? a.species}{a.breed ? ` · ${a.breed}` : ""}
                  {a.housing ? ` · ${a.housing.name}` : ""}
                  {a.weightKg ? ` · ${a.weightKg}kg` : ""}
                </div>
                <span style={{ background: healthColor(a.healthStatus), color: "white", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999, textTransform: "capitalize" }}>
                  {a.healthStatus}
                </span>
                {a.status !== "active" && (
                  <span style={{ background: "#A89F91", color: "white", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999, textTransform: "capitalize" }}>
                    {a.status}
                  </span>
                )}
                <ChevronRight size={18} color={MUTED} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
