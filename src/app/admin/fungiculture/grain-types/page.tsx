"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, X, Loader2, Wheat } from "lucide-react"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"

const field: React.CSSProperties = { width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT }
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 4, display: "block" }

interface GrainType { id: string; name: string; active: boolean }

export default function GrainTypesPage() {
  const [grainTypes, setGrainTypes] = useState<GrainType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [name, setName] = useState("")

  const load = async () => {
    try {
      const res = await fetch("/api/fungiculture/grain-types")
      if (res.ok) setGrainTypes(await res.json())
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    setError("")
    if (!name.trim()) { setError("Enter a grain type name."); return }
    setSaving(true)
    try {
      const res = await fetch("/api/fungiculture/grain-types", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not create grain type."); return }
      setName(""); setShowForm(false)
      await load()
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  const toggleActive = async (g: GrainType) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/fungiculture/grain-types/${g.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !g.active }),
      })
      if (res.ok) await load()
    } finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <Link href="/admin/fungiculture" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 13, textDecoration: "none", marginBottom: 14 }}>
        <ArrowLeft size={15} /> Fungiculture
      </Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Wheat size={22} color={GREEN} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Grain Types</h1>
            <p style={{ fontSize: 12, color: MUTED }}>Spawn grain types available when creating a spawn batch</p>
          </div>
        </div>
        <Button onClick={() => setShowForm((s) => !s)} style={{ background: GREEN, color: "white", gap: 6, height: 34, fontSize: 13 }}>
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Cancel" : "New Grain Type"}
        </Button>
      </div>

      {showForm && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          {error && <div style={{ background: "#FDEDED", color: "#C0392B", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <label style={label}>Name</label>
          <Input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sorghum" />
          <Button onClick={create} disabled={saving} style={{ background: GREEN, color: "white", marginTop: 14, gap: 6 }}>
            {saving && <Loader2 size={16} className="animate-spin" />} Create Grain Type
          </Button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
      ) : grainTypes.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED }}>No grain types yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {grainTypes.map((g) => (
            <div key={g.id} style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: TEXT }}>{g.name}</div>
              <span style={{ background: g.active ? GREEN : "#A89F91", color: "white", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999 }}>
                {g.active ? "Active" : "Inactive"}
              </span>
              <Button onClick={() => toggleActive(g)} disabled={saving} style={{ background: "var(--admin-card-2)", color: TEXT, border: "1px solid var(--admin-border)", height: 30, fontSize: 12 }}>
                {g.active ? "Deactivate" : "Activate"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
