"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sprout, Plus, X, Loader2, ChevronRight } from "lucide-react"
import { STAGE_LABELS, type Stage } from "@/lib/mycology-stages"
import { isAdminishRole } from "@/lib/tracing-stages"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const BROWN = "#8C6A4A"

const field: React.CSSProperties = {
  width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT,
}
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 4, display: "block" }

interface SpawnRow {
  id: string
  code: string
  grainType: string
  quantityKg: number
  status: string
  colonizationPercent: number | null
  createdAt: string
}

const SPAWN_NEXT: Record<string, string> = { sterilizing: "incubating", incubating: "ready" }
const SPAWN_NEXT_LABEL: Record<string, string> = { sterilizing: "Mark Incubating", incubating: "Mark Ready" }

interface BatchRow {
  id: string
  code: string
  stage: Stage
  status: string
  createdAt: string
  substrate: { bagCount: number } | null
}

function statusBadge(status: string) {
  const c = status === "completed" || status === "ready" ? GREEN : status === "contaminated" ? "#C0392B" : BROWN
  return (
    <span style={{ background: c, color: "white", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999, textTransform: "capitalize" }}>
      {status.replace("_", " ")}
    </span>
  )
}

const GRAIN_TYPES = ["wheat", "rye", "oats", "millet"]

export default function MycologyBoard() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || "merchant"
  const canCreate = role === "fungiculturist" || isAdminishRole(role)

  const [spawn, setSpawn] = useState<SpawnRow[]>([])
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showSpawnForm, setShowSpawnForm] = useState(false)
  const [showBatchForm, setShowBatchForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [sf, setSf] = useState({ grainType: "wheat", quantityKg: "", remarks: "" })
  const [bf, setBf] = useState({
    spawnId: "", strawKg: "", limeKg: "", branKg: "", cottonSeedCakeKg: "",
    soakHours: "12", bagCount: "", bagWeightKg: "2", pasteurizeHours: "4", coolHours: "4", remarks: "",
  })

  const load = async () => {
    try {
      const [sRes, bRes] = await Promise.all([fetch("/api/mycology/spawn"), fetch("/api/mycology/batches")])
      if (sRes.ok) setSpawn(await sRes.json())
      if (bRes.ok) setBatches(await bRes.json())
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const readySpawn = spawn.filter((s) => s.status === "ready")

  const advanceSpawn = async (s: SpawnRow) => {
    const next = SPAWN_NEXT[s.status]
    if (!next) return
    setSaving(true)
    try {
      const res = await fetch(`/api/mycology/spawn/${s.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }),
      })
      if (res.ok) await load()
    } finally { setSaving(false) }
  }

  const createSpawn = async () => {
    setError("")
    if (!sf.quantityKg || Number(sf.quantityKg) <= 0) { setError("Enter a quantity for the spawn batch."); return }
    setSaving(true)
    try {
      const res = await fetch("/api/mycology/spawn", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sf),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not create spawn batch."); return }
      setSf({ grainType: "wheat", quantityKg: "", remarks: "" })
      setShowSpawnForm(false)
      await load()
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  const createBatch = async () => {
    setError("")
    if (!bf.bagCount || Number(bf.bagCount) <= 0) { setError("Enter how many substrate bags were filled."); return }
    setSaving(true)
    try {
      const res = await fetch("/api/mycology/batches", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bf),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not create batch."); return }
      router.push(`/admin/mycology/${data.id}`)
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sprout size={22} color={GREEN} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Mycology</h1>
            <p style={{ fontSize: 12, color: MUTED }}>Spawn inventory and substrate → harvest cultivation batches</p>
          </div>
        </div>
      </div>

      {/* ── Spawn inventory ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Spawn Inventory</h2>
        {canCreate && (
          <Button onClick={() => setShowSpawnForm((s) => !s)} style={{ background: GREEN, color: "white", gap: 6, height: 34, fontSize: 13 }}>
            {showSpawnForm ? <X size={14} /> : <Plus size={14} />} {showSpawnForm ? "Cancel" : "New Spawn Batch"}
          </Button>
        )}
      </div>

      {showSpawnForm && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          {error && <div style={{ background: "#FDEDED", color: "#C0392B", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div>
              <label style={label}>Grain Type</label>
              <select style={field} value={sf.grainType} onChange={(e) => setSf({ ...sf, grainType: e.target.value })}>
                {GRAIN_TYPES.map((g) => <option key={g} value={g}>{g[0].toUpperCase() + g.slice(1)}</option>)}
              </select>
            </div>
            <div><label style={label}>Quantity (kg)</label><Input style={field} type="number" value={sf.quantityKg} onChange={(e) => setSf({ ...sf, quantityKg: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={label}>Remarks</label>
            <textarea style={{ ...field, height: 60, padding: 10 }} value={sf.remarks} onChange={(e) => setSf({ ...sf, remarks: e.target.value })} />
          </div>
          <Button onClick={createSpawn} disabled={saving} style={{ background: GREEN, color: "white", marginTop: 14, gap: 6 }}>
            {saving && <Loader2 size={16} className="animate-spin" />} Create Spawn Batch
          </Button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 30, color: MUTED }}><Loader2 className="animate-spin" /></div>
      ) : spawn.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, color: MUTED, marginBottom: 30 }}>No spawn batches yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginBottom: 30 }}>
          {spawn.map((s) => (
            <div key={s.id} style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ minWidth: 90 }}>
                <div style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>{s.code}</div>
                <div style={{ fontSize: 11, color: MUTED }}>{new Date(s.createdAt).toLocaleDateString()}</div>
              </div>
              <div style={{ flex: 1, fontSize: 13, color: TEXT, textTransform: "capitalize" }}>
                {s.grainType} · {s.quantityKg}kg{s.colonizationPercent != null ? ` · ${s.colonizationPercent}% colonized` : ""}
              </div>
              {canCreate && SPAWN_NEXT[s.status] && (
                <Button onClick={() => advanceSpawn(s)} disabled={saving} style={{ background: "var(--admin-card-2)", color: TEXT, border: "1px solid var(--admin-border)", height: 30, fontSize: 12, gap: 5 }}>
                  {SPAWN_NEXT_LABEL[s.status]}
                </Button>
              )}
              {statusBadge(s.status)}
            </div>
          ))}
        </div>
      )}

      {/* ── Batches ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Cultivation Batches</h2>
        {canCreate && (
          <Button onClick={() => setShowBatchForm((s) => !s)} style={{ background: GREEN, color: "white", gap: 6, height: 34, fontSize: 13 }}>
            {showBatchForm ? <X size={14} /> : <Plus size={14} />} {showBatchForm ? "Cancel" : "New Batch"}
          </Button>
        )}
      </div>

      {showBatchForm && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 14 }}>Substrate Preparation (Stage 1)</h3>
          {error && <div style={{ background: "#FDEDED", color: "#C0392B", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ marginBottom: 12 }}>
            <label style={label}>Spawn Used {readySpawn.length === 0 && <span style={{ fontWeight: 400 }}>(no ready spawn batches yet — optional)</span>}</label>
            <select style={field} value={bf.spawnId} onChange={(e) => setBf({ ...bf, spawnId: e.target.value })}>
              <option value="">— none / not tracked —</option>
              {readySpawn.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.grainType} · {s.quantityKg}kg</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <div><label style={label}>Straw (kg)</label><Input style={field} type="number" value={bf.strawKg} onChange={(e) => setBf({ ...bf, strawKg: e.target.value })} /></div>
            <div><label style={label}>Lime (kg)</label><Input style={field} type="number" value={bf.limeKg} onChange={(e) => setBf({ ...bf, limeKg: e.target.value })} /></div>
            <div><label style={label}>Bran (kg)</label><Input style={field} type="number" value={bf.branKg} onChange={(e) => setBf({ ...bf, branKg: e.target.value })} /></div>
            <div><label style={label}>Cotton Seed Cake (kg)</label><Input style={field} type="number" value={bf.cottonSeedCakeKg} onChange={(e) => setBf({ ...bf, cottonSeedCakeKg: e.target.value })} /></div>
            <div><label style={label}>Soak Hours</label><Input style={field} type="number" value={bf.soakHours} onChange={(e) => setBf({ ...bf, soakHours: e.target.value })} /></div>
            <div><label style={label}>Bag Count</label><Input style={field} type="number" value={bf.bagCount} onChange={(e) => setBf({ ...bf, bagCount: e.target.value })} /></div>
            <div><label style={label}>Bag Weight (kg)</label><Input style={field} type="number" value={bf.bagWeightKg} onChange={(e) => setBf({ ...bf, bagWeightKg: e.target.value })} /></div>
            <div><label style={label}>Pasteurize Hours</label><Input style={field} type="number" value={bf.pasteurizeHours} onChange={(e) => setBf({ ...bf, pasteurizeHours: e.target.value })} /></div>
            <div><label style={label}>Cool Hours</label><Input style={field} type="number" value={bf.coolHours} onChange={(e) => setBf({ ...bf, coolHours: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={label}>Remarks</label>
            <textarea style={{ ...field, height: 60, padding: 10 }} value={bf.remarks} onChange={(e) => setBf({ ...bf, remarks: e.target.value })} />
          </div>
          <Button onClick={createBatch} disabled={saving} style={{ background: GREEN, color: "white", marginTop: 14, gap: 6 }}>
            {saving && <Loader2 size={16} className="animate-spin" />} Create Batch
          </Button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
      ) : batches.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED }}>No batches yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {batches.map((b) => (
            <Link key={b.id} href={`/admin/mycology/${b.id}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ minWidth: 90 }}>
                  <div style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>{b.code}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{new Date(b.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: TEXT }}>{b.substrate?.bagCount ?? 0} bags</div>
                  {b.status !== "completed" && (
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
