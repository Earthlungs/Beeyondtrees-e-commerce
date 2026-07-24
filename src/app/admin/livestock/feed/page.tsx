"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, X, Loader2, Wheat, ClipboardList } from "lucide-react"
import { FEED_UNITS } from "@/lib/livestock-stages"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const RED = "#C0392B"

const field: React.CSSProperties = { width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT }
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 4, display: "block" }

interface FeedTypeRow { id: string; name: string; unit: string; stockQty: number; active: boolean }
interface HousingOption { id: string; name: string; code: string; status: string }
interface AnimalOption { id: string; code: string; tagId: string | null; species: string }
interface FeedingLogRow {
  id: string; quantity: number; fedAt: string; loggedBy: string | null
  feedType: { name: string; unit: string }
  housing: { name: string; code: string } | null
  animal: { code: string; tagId: string | null } | null
}

const emptyFtForm = { name: "", unit: "kg", stockQty: "" }
const emptyLogForm = { feedTypeId: "", housingId: "", animalId: "", quantity: "", fedAt: "", notes: "" }

export default function LivestockFeedPage() {
  const [feedTypes, setFeedTypes] = useState<FeedTypeRow[]>([])
  const [housing, setHousing] = useState<HousingOption[]>([])
  const [animals, setAnimals] = useState<AnimalOption[]>([])
  const [logs, setLogs] = useState<FeedingLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showFtForm, setShowFtForm] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [ftForm, setFtForm] = useState(emptyFtForm)
  const [logForm, setLogForm] = useState(emptyLogForm)

  const load = async () => {
    try {
      const [ftRes, hRes, aRes, lRes] = await Promise.all([
        fetch("/api/livestock/feed-types"), fetch("/api/livestock/housing"),
        fetch("/api/livestock/animals"), fetch("/api/livestock/feeding-logs"),
      ])
      if (ftRes.ok) setFeedTypes(await ftRes.json())
      if (hRes.ok) setHousing((await hRes.json()).filter((h: HousingOption) => h.status === "active"))
      if (aRes.ok) setAnimals(await aRes.json())
      if (lRes.ok) setLogs(await lRes.json())
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const createFeedType = async () => {
    setError("")
    if (!ftForm.name.trim()) { setError("Enter a name for the feed type."); return }
    setSaving(true)
    try {
      const res = await fetch("/api/livestock/feed-types", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ftForm),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not create the feed type."); return }
      setFtForm(emptyFtForm); setShowFtForm(false)
      await load()
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  const logFeeding = async () => {
    setError("")
    if (!logForm.feedTypeId) { setError("Select a feed type."); return }
    if (!logForm.housingId && !logForm.animalId) { setError("Select a housing unit or an animal record."); return }
    if (!logForm.quantity || Number(logForm.quantity) <= 0) { setError("Enter a quantity fed."); return }
    setSaving(true)
    try {
      const res = await fetch("/api/livestock/feeding-logs", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(logForm),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not log the feeding."); return }
      setLogForm(emptyLogForm); setShowLogForm(false)
      await load()
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <Link href="/admin/livestock" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 13, textDecoration: "none", marginBottom: 14 }}>
        <ArrowLeft size={15} /> Livestock
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Wheat size={22} color={GREEN} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Feed</h1>
          <p style={{ fontSize: 12, color: MUTED }}>Feed types, stock on hand, and feeding logs</p>
        </div>
      </div>

      {/* ── Feed types ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Feed Types</h2>
        <Button onClick={() => setShowFtForm((s) => !s)} style={{ background: GREEN, color: "white", gap: 6, height: 34, fontSize: 13 }}>
          {showFtForm ? <X size={14} /> : <Plus size={14} />} {showFtForm ? "Cancel" : "New Feed Type"}
        </Button>
      </div>

      {showFtForm && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          {error && <div style={{ background: "#FDEDED", color: RED, padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <div><label style={label}>Name</label><Input style={field} value={ftForm.name} onChange={(e) => setFtForm({ ...ftForm, name: e.target.value })} placeholder="e.g. Dairy Meal" /></div>
            <div>
              <label style={label}>Unit</label>
              <select style={field} value={ftForm.unit} onChange={(e) => setFtForm({ ...ftForm, unit: e.target.value })}>
                {FEED_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div><label style={label}>Opening Stock</label><Input style={field} type="number" value={ftForm.stockQty} onChange={(e) => setFtForm({ ...ftForm, stockQty: e.target.value })} /></div>
          </div>
          <Button onClick={createFeedType} disabled={saving} style={{ background: GREEN, color: "white", marginTop: 14, gap: 6 }}>
            {saving && <Loader2 size={16} className="animate-spin" />} Create Feed Type
          </Button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 30, color: MUTED }}><Loader2 className="animate-spin" /></div>
      ) : feedTypes.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, color: MUTED, marginBottom: 30 }}>No feed types yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginBottom: 30 }}>
          {feedTypes.map((ft) => (
            <div key={ft.id} style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1, fontWeight: 700, color: TEXT, fontSize: 14 }}>{ft.name}</div>
              <div style={{ fontSize: 13, color: ft.stockQty <= 0 ? RED : TEXT }}>{ft.stockQty} {ft.unit} in stock</div>
              {!ft.active && <span style={{ background: "#A89F91", color: "white", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999 }}>Inactive</span>}
            </div>
          ))}
        </div>
      )}

      {/* ── Feeding logs ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Feeding Log</h2>
        <Button onClick={() => setShowLogForm((s) => !s)} style={{ background: GREEN, color: "white", gap: 6, height: 34, fontSize: 13 }}>
          {showLogForm ? <X size={14} /> : <Plus size={14} />} {showLogForm ? "Cancel" : "Log Feeding"}
        </Button>
      </div>

      {showLogForm && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          {error && <div style={{ background: "#FDEDED", color: RED, padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div>
              <label style={label}>Feed Type</label>
              <select style={field} value={logForm.feedTypeId} onChange={(e) => setLogForm({ ...logForm, feedTypeId: e.target.value })}>
                <option value="">— select —</option>
                {feedTypes.filter((f) => f.active).map((f) => <option key={f.id} value={f.id}>{f.name} ({f.stockQty} {f.unit} left)</option>)}
              </select>
            </div>
            <div><label style={label}>Quantity</label><Input style={field} type="number" value={logForm.quantity} onChange={(e) => setLogForm({ ...logForm, quantity: e.target.value })} /></div>
            <div>
              <label style={label}>Housing</label>
              <select style={field} value={logForm.housingId} onChange={(e) => setLogForm({ ...logForm, housingId: e.target.value })}>
                <option value="">— none —</option>
                {housing.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.code})</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Animal</label>
              <select style={field} value={logForm.animalId} onChange={(e) => setLogForm({ ...logForm, animalId: e.target.value })}>
                <option value="">— none —</option>
                {animals.map((a) => <option key={a.id} value={a.id}>{a.code}{a.tagId ? ` · Tag ${a.tagId}` : ""}</option>)}
              </select>
            </div>
            <div><label style={label}>Date/Time Fed</label><Input style={field} type="datetime-local" value={logForm.fedAt} onChange={(e) => setLogForm({ ...logForm, fedAt: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={label}>Notes</label>
            <textarea style={{ ...field, height: 60, padding: 10 }} value={logForm.notes} onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} />
          </div>
          <Button onClick={logFeeding} disabled={saving} style={{ background: GREEN, color: "white", marginTop: 14, gap: 6 }}>
            {saving && <Loader2 size={16} className="animate-spin" />} Log Feeding
          </Button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <ClipboardList size={22} /> No feeding logged yet.
        </div>
      ) : (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--admin-card-2)", textAlign: "left" }}>
                <th style={{ padding: "10px 14px", color: MUTED, fontWeight: 600 }}>Date</th>
                <th style={{ padding: "10px 14px", color: MUTED, fontWeight: 600 }}>Feed</th>
                <th style={{ padding: "10px 14px", color: MUTED, fontWeight: 600 }}>Quantity</th>
                <th style={{ padding: "10px 14px", color: MUTED, fontWeight: 600 }}>Fed To</th>
                <th style={{ padding: "10px 14px", color: MUTED, fontWeight: 600 }}>Logged By</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                  <td style={{ padding: "10px 14px", color: TEXT }}>{new Date(l.fedAt).toLocaleString("en-KE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</td>
                  <td style={{ padding: "10px 14px", color: TEXT }}>{l.feedType.name}</td>
                  <td style={{ padding: "10px 14px", color: TEXT }}>{l.quantity} {l.feedType.unit}</td>
                  <td style={{ padding: "10px 14px", color: TEXT }}>{l.housing ? l.housing.name : l.animal ? `${l.animal.code}${l.animal.tagId ? ` (Tag ${l.animal.tagId})` : ""}` : "—"}</td>
                  <td style={{ padding: "10px 14px", color: MUTED }}>{l.loggedBy ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
