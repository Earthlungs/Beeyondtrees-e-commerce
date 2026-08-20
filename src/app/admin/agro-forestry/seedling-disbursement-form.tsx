"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, X, Sprout, AlertTriangle, Plus, Trash2, Search } from "lucide-react"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const CARD = "var(--admin-card)"
const BORDER = "1px solid var(--admin-border)"
const GREEN = "#6B7D5C"
const RED = "#C0392B"

const field: React.CSSProperties = {
  width: "100%", height: 38, borderRadius: 8, border: BORDER,
  padding: "0 10px", color: TEXT, background: CARD, fontSize: 13,
}
const label: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 4, display: "block",
}

const NEW_SPECIES = "__new__"

export interface FarmerPick { id: number; fullname: string; county: string }

interface SeedlingOption { id: number; seedlingSpicies: string }
interface Line { seedlingId: string; species: string; quantity: string }

const emptyLine = (): Line => ({ seedlingId: "", species: "", quantity: "" })

// Record seedlings handed to a farmer. Opened either from the board (pick the
// farmer here) or from a farmer's drawer (`farmer` fixed, no picker).
export default function SeedlingDisbursementForm({
  farmer, onClose, onSaved,
}: {
  farmer?: FarmerPick | null
  onClose: () => void
  onSaved: () => void
}) {
  const { data: session } = useSession()
  const [target, setTarget] = useState<FarmerPick | null>(farmer ?? null)
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<FarmerPick[]>([])
  const [searching, setSearching] = useState(false)

  const [centre, setCentre] = useState("")
  const [centres, setCentres] = useState<string[]>([])
  const [seedlings, setSeedlings] = useState<SeedlingOption[]>([])
  const [disbursedBy, setDisbursedBy] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [lines, setLines] = useState<Line[]>([emptyLine()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/agro-forestry/options")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        setSeedlings(Array.isArray(d.seedlings) ? d.seedlings : [])
        setCentres(Array.isArray(d.centres) ? d.centres : [])
      })
      .catch(() => {})
  }, [])

  // "Disbursed by" defaults to the signed-in officer — they are almost always
  // the one handing the seedlings over. Derived rather than seeded via an
  // effect, so it is right on the first render and still fully editable.
  const disbursedByValue = disbursedBy || session?.user?.name || ""

  // Farmer type-ahead (only when the form was opened without one). Everything
  // happens inside the debounce timer, so nothing sets state during the effect.
  const searchable = !target && search.trim().length >= 2
  useEffect(() => {
    if (!searchable) return
    let cancelled = false
    const t = setTimeout(() => {
      if (cancelled) return
      setSearching(true)
      fetch(`/api/agro-forestry/farmers?q=${encodeURIComponent(search.trim())}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (!cancelled && d?.rows) setResults(d.rows.slice(0, 8)) })
        .catch(() => {})
        .finally(() => { if (!cancelled) setSearching(false) })
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [search, searchable])

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))

  const totalQty = lines.reduce((n, l) => n + (Number(l.quantity) || 0), 0)

  const submit = async () => {
    setError("")
    if (!target) { setError("Choose the farmer receiving the seedlings."); return }
    if (!centre.trim()) { setError("Enter the disbursement centre."); return }
    const payload = lines
      .filter((l) => Number(l.quantity) > 0 && (l.seedlingId || l.species.trim()))
      .map((l) => ({
        seedlingId: l.seedlingId && l.seedlingId !== NEW_SPECIES ? Number(l.seedlingId) : undefined,
        species: l.seedlingId === NEW_SPECIES || !l.seedlingId ? l.species.trim() : undefined,
        quantity: Number(l.quantity),
      }))
    if (payload.length === 0) { setError("Add at least one species with a quantity."); return }

    setSaving(true)
    try {
      const res = await fetch("/api/agro-forestry/disbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: target.id,
          disbursementCentre: centre.trim(),
          disbursedBy: disbursedByValue.trim(),
          disbursementDate: date,
          lines: payload,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? "Could not record the disbursement."); return }
      onSaved()
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 62 }} />
      <aside style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(540px, 100%)",
        background: CARD, borderLeft: BORDER, zIndex: 63, overflowY: "auto", padding: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sprout size={20} color={GREEN} />
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>Disburse Seedlings</h2>
              <p style={{ fontSize: 12, color: MUTED }}>Records a handover against the farmer&apos;s register entry</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: "#FDEDED", color: RED, padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14, display: "flex", gap: 8 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> <div>{error}</div>
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={label}>Farmer<span style={{ color: RED }}> *</span></label>
            {target ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, border: BORDER, borderRadius: 8, padding: "8px 10px" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{target.fullname}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{target.county}</div>
                </div>
                {!farmer && (
                  <button onClick={() => { setTarget(null); setSearch("") }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 12 }}>
                    Change
                  </button>
                )}
              </div>
            ) : (
              <>
                <div style={{ position: "relative" }}>
                  <Search size={15} color={MUTED} style={{ position: "absolute", left: 10, top: 11, pointerEvents: "none" }} />
                  <Input style={{ ...field, paddingLeft: 32 }} value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, ID number or phone…" />
                </div>
                {searchable && searching && <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>Searching…</div>}
                {searchable && results.length > 0 && (
                  <div style={{ border: BORDER, borderRadius: 8, marginTop: 6, overflow: "hidden" }}>
                    {results.map((r) => (
                      <button key={r.id} onClick={() => { setTarget(r); setResults([]) }}
                        style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: BORDER, padding: "8px 10px", cursor: "pointer", color: TEXT, fontSize: 13 }}>
                        {r.fullname} <span style={{ color: MUTED, fontSize: 11 }}>· {r.county}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12 }}>
            <div>
              <label style={label}>Disbursement centre<span style={{ color: RED }}> *</span></label>
              <Input style={field} value={centre} list="af-centres" onChange={(e) => setCentre(e.target.value)} placeholder="e.g. Ganze Centre" />
              <datalist id="af-centres">
                {centres.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label style={label}>Date</label>
              <Input style={field} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label style={label}>Disbursed by</label>
              <Input style={field} value={disbursedByValue} onChange={(e) => setDisbursedBy(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={label}>Species handed over<span style={{ color: RED }}> *</span></label>
            <div style={{ display: "grid", gap: 8 }}>
              {lines.map((l, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 96px 32px", gap: 8, alignItems: "start" }}>
                  <div>
                    <select
                      style={field}
                      value={l.seedlingId}
                      onChange={(e) => setLine(i, { seedlingId: e.target.value, species: e.target.value === NEW_SPECIES ? l.species : "" })}>
                      <option value="">Select species…</option>
                      {seedlings.map((s) => <option key={s.id} value={String(s.id)}>{s.seedlingSpicies}</option>)}
                      <option value={NEW_SPECIES}>Other — type a new one…</option>
                    </select>
                    {l.seedlingId === NEW_SPECIES && (
                      <Input autoFocus style={{ ...field, marginTop: 6 }} value={l.species}
                        placeholder="New species name" onChange={(e) => setLine(i, { species: e.target.value })} />
                    )}
                  </div>
                  <Input style={field} type="number" min="1" inputMode="numeric" placeholder="Qty"
                    value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                  <button
                    onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls))}
                    disabled={lines.length === 1}
                    style={{ background: "none", border: "none", cursor: lines.length === 1 ? "default" : "pointer", color: lines.length === 1 ? MUTED : "#8C6A4A", height: 38 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setLines((ls) => [...ls, emptyLine()])}
              style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${GREEN}`, color: GREEN, borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              <Plus size={14} /> Add species
            </button>
          </div>

          {totalQty > 0 && (
            <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>
              Total: {totalQty.toLocaleString("en-KE")} seedlings
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          <Button onClick={submit} disabled={saving} style={{ background: GREEN, color: "white", gap: 6, flex: 1, minWidth: 180 }}>
            {saving && <Loader2 size={16} className="animate-spin" />} Record Disbursement
          </Button>
          <Button onClick={onClose} disabled={saving} style={{ background: CARD, color: TEXT, border: BORDER }}>
            Cancel
          </Button>
        </div>
      </aside>
    </>
  )
}
