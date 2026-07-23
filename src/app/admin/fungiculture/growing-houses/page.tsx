"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, X, Loader2, AlertTriangle, Warehouse } from "lucide-react"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"

const field: React.CSSProperties = { width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT }
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 4, display: "block" }

const COUNTRIES = ["Kenya", "Tanzania"]

interface GrowingHouse {
  id: string
  code: string
  name: string
  country: string
  region: string | null
  location: string | null
  lengthM: number | null
  widthM: number | null
  maxBagCapacity: number
  status: string
  notes: string | null
  activeIncubationCount: number
}

const emptyForm = { name: "", country: "Kenya", region: "", location: "", lengthM: "", widthM: "", maxBagCapacity: "", notes: "" }

export default function GrowingHousesPage() {
  const [houses, setHouses] = useState<GrowingHouse[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch("/api/fungiculture/growing-houses")
      if (res.ok) setHouses(await res.json())
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const startEdit = (h: GrowingHouse) => {
    setEditingId(h.id)
    setForm({
      name: h.name, country: h.country, region: h.region ?? "", location: h.location ?? "",
      lengthM: h.lengthM?.toString() ?? "", widthM: h.widthM?.toString() ?? "",
      maxBagCapacity: h.maxBagCapacity.toString(), notes: h.notes ?? "",
    })
    setShowForm(true)
  }

  const toggleStatus = async (h: GrowingHouse) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/fungiculture/growing-houses/${h.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: h.status === "active" ? "inactive" : "active" }),
      })
      if (res.ok) await load()
    } finally { setSaving(false) }
  }

  const save = async () => {
    setError("")
    if (!form.name.trim()) { setError("Enter a name for the growing house."); return }
    setSaving(true)
    try {
      const url = editingId ? `/api/fungiculture/growing-houses/${editingId}` : "/api/fungiculture/growing-houses"
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not save the growing house."); return }
      setForm(emptyForm); setEditingId(null); setShowForm(false)
      await load()
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  const areaM2 = (h: GrowingHouse) => (h.lengthM && h.widthM ? (h.lengthM * h.widthM).toFixed(1) : null)

  return (
    <div style={{ maxWidth: 900 }}>
      <Link href="/admin/fungiculture" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 13, textDecoration: "none", marginBottom: 14 }}>
        <ArrowLeft size={15} /> Fungiculture
      </Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Warehouse size={22} color={GREEN} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Growing Houses</h1>
            <p style={{ fontSize: 12, color: MUTED }}>Where batches are hung during incubation — location, size, and bag capacity</p>
          </div>
        </div>
        <Button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm((s) => !s) }} style={{ background: GREEN, color: "white", gap: 6, height: 34, fontSize: 13 }}>
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Cancel" : "New Growing House"}
        </Button>
      </div>

      {showForm && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          {error && <div style={{ background: "#FDEDED", color: "#C0392B", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div><label style={label}>Name</label><Input style={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <label style={label}>Country</label>
              <select style={field} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={label}>Region / Area</label><Input style={field} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
            <div><label style={label}>Max Bag Capacity</label><Input style={field} type="number" value={form.maxBagCapacity} onChange={(e) => setForm({ ...form, maxBagCapacity: e.target.value })} /></div>
            <div><label style={label}>Length (m)</label><Input style={field} type="number" value={form.lengthM} onChange={(e) => setForm({ ...form, lengthM: e.target.value })} /></div>
            <div><label style={label}>Width (m)</label><Input style={field} type="number" value={form.widthM} onChange={(e) => setForm({ ...form, widthM: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={label}>Specific Location</label>
            <Input style={field} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Behind the main store, plot 4" />
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={label}>Notes</label>
            <textarea style={{ ...field, height: 60, padding: 10 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button onClick={save} disabled={saving} style={{ background: GREEN, color: "white", marginTop: 14, gap: 6 }}>
            {saving && <Loader2 size={16} className="animate-spin" />} {editingId ? "Save Changes" : "Create Growing House"}
          </Button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
      ) : houses.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED }}>No growing houses yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {houses.map((h) => {
            const overCapacity = h.maxBagCapacity > 0 && h.activeIncubationCount >= h.maxBagCapacity
            return (
              <div key={h.id} style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>{h.name}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{h.code} · {h.country}{h.region ? ` · ${h.region}` : ""}</div>
                </div>
                <div style={{ flex: 1, minWidth: 160, fontSize: 13, color: TEXT }}>
                  {areaM2(h) ? `${areaM2(h)} m² · ` : ""}
                  {h.maxBagCapacity > 0 ? `${h.activeIncubationCount}/${h.maxBagCapacity} bags` : "capacity not set"}
                </div>
                {overCapacity && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#FDF3E3", color: "#8C6A4A", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999 }}>
                    <AlertTriangle size={12} /> Over capacity
                  </span>
                )}
                <span style={{ background: h.status === "active" ? GREEN : "#A89F91", color: "white", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999, textTransform: "capitalize" }}>
                  {h.status}
                </span>
                <Button onClick={() => startEdit(h)} style={{ background: "var(--admin-card-2)", color: TEXT, border: "1px solid var(--admin-border)", height: 30, fontSize: 12 }}>Edit</Button>
                <Button onClick={() => toggleStatus(h)} disabled={saving} style={{ background: "var(--admin-card-2)", color: TEXT, border: "1px solid var(--admin-border)", height: 30, fontSize: 12 }}>
                  {h.status === "active" ? "Deactivate" : "Activate"}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
