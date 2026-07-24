"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, X, Loader2, AlertTriangle, Warehouse } from "lucide-react"
import { HOUSING_TYPES, HOUSING_TYPE_LABELS } from "@/lib/livestock-stages"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"

const field: React.CSSProperties = { width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT }
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 4, display: "block" }

const COUNTRIES = ["Kenya", "Tanzania"]

interface Housing {
  id: string
  code: string
  name: string
  type: string
  country: string
  region: string | null
  location: string | null
  capacity: number
  status: string
  notes: string | null
  activeAnimalCount: number
}

const emptyForm = { name: "", type: "pen", country: "Kenya", region: "", location: "", capacity: "", notes: "" }

export default function LivestockHousingPage() {
  const [houses, setHouses] = useState<Housing[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch("/api/livestock/housing")
      if (res.ok) setHouses(await res.json())
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const startEdit = (h: Housing) => {
    setEditingId(h.id)
    setForm({
      name: h.name, type: h.type, country: h.country, region: h.region ?? "",
      location: h.location ?? "", capacity: h.capacity.toString(), notes: h.notes ?? "",
    })
    setShowForm(true)
  }

  const toggleStatus = async (h: Housing) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/livestock/housing/${h.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: h.status === "active" ? "inactive" : "active" }),
      })
      if (res.ok) await load()
    } finally { setSaving(false) }
  }

  const save = async () => {
    setError("")
    if (!form.name.trim()) { setError("Enter a name for the housing unit."); return }
    setSaving(true)
    try {
      const url = editingId ? `/api/livestock/housing/${editingId}` : "/api/livestock/housing"
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not save the housing unit."); return }
      setForm(emptyForm); setEditingId(null); setShowForm(false)
      await load()
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <Link href="/admin/livestock" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 13, textDecoration: "none", marginBottom: 14 }}>
        <ArrowLeft size={15} /> Livestock
      </Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Warehouse size={22} color={GREEN} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Housing</h1>
            <p style={{ fontSize: 12, color: MUTED }}>Barns, pens, coops &amp; paddocks — location, type, and capacity</p>
          </div>
        </div>
        <Button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm((s) => !s) }} style={{ background: GREEN, color: "white", gap: 6, height: 34, fontSize: 13 }}>
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Cancel" : "New Housing Unit"}
        </Button>
      </div>

      {showForm && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          {error && <div style={{ background: "#FDEDED", color: "#C0392B", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div><label style={label}>Name</label><Input style={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <label style={label}>Type</label>
              <select style={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {HOUSING_TYPES.map((t) => <option key={t} value={t}>{HOUSING_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Country</label>
              <select style={field} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={label}>Region / Area</label><Input style={field} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
            <div><label style={label}>Capacity (head)</label><Input style={field} type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={label}>Specific Location</label>
            <Input style={field} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. North field, behind the store" />
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={label}>Notes</label>
            <textarea style={{ ...field, height: 60, padding: 10 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button onClick={save} disabled={saving} style={{ background: GREEN, color: "white", marginTop: 14, gap: 6 }}>
            {saving && <Loader2 size={16} className="animate-spin" />} {editingId ? "Save Changes" : "Create Housing Unit"}
          </Button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
      ) : houses.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED }}>No housing units yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {houses.map((h) => {
            const overCapacity = h.capacity > 0 && h.activeAnimalCount >= h.capacity
            return (
              <div key={h.id} style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>{h.name}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{h.code} · {HOUSING_TYPE_LABELS[h.type] ?? h.type} · {h.country}{h.region ? ` · ${h.region}` : ""}</div>
                </div>
                <div style={{ flex: 1, minWidth: 160, fontSize: 13, color: TEXT }}>
                  {h.capacity > 0 ? `${h.activeAnimalCount}/${h.capacity} head` : `${h.activeAnimalCount} head · capacity not set`}
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
