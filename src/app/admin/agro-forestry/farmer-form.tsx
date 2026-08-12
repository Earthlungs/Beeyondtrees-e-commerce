"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, X, UserPlus, AlertTriangle } from "lucide-react"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const CARD = "var(--admin-card)"
const BORDER = "1px solid var(--admin-border)"
const GREEN = "#6B7D5C"

const field: React.CSSProperties = {
  width: "100%", height: 38, borderRadius: 8, border: BORDER,
  padding: "0 10px", color: TEXT, background: CARD, fontSize: 13,
}
const label: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 4, display: "block",
}

const OTHER = "__other__"

interface Options {
  counties: string[]
  subCounties: string[]
  projectTypes: string[]
  landOwnershipTypes: string[]
  groups: string[]
}

// A select over values already in the register, with an escape hatch. Picking
// an existing value is one click; adding a genuinely new one is still possible
// but deliberate — which is what stops "Personal" / "personal " / "Personal Land"
// from multiplying the way they did in the imported data.
function Choice({ name, value, onChange, options, required, placeholder }: {
  name: string
  value: string
  onChange: (v: string) => void
  options: string[]
  required?: boolean
  placeholder?: string
}) {
  // "Other" is sticky once chosen, so typing a value that happens to match an
  // existing option doesn't yank the input away mid-keystroke.
  const [custom, setCustom] = useState(false)
  const isOther = custom || (value !== "" && !options.includes(value))

  return (
    <div>
      <label style={label}>{name}{required && <span style={{ color: "#C0392B" }}> *</span>}</label>
      <select
        style={field}
        value={isOther ? OTHER : value}
        onChange={(e) => {
          if (e.target.value === OTHER) { setCustom(true); onChange("") }
          else { setCustom(false); onChange(e.target.value) }
        }}
      >
        <option value="">{placeholder ?? "Select…"}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value={OTHER}>Other — type a new one…</option>
      </select>
      {isOther && (
        <Input
          autoFocus
          style={{ ...field, marginTop: 6 }}
          value={value}
          placeholder={`New ${name.toLowerCase()}`}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

// Free-text with type-ahead suggestions. Used where a <select> would be
// unusable — there are 137 distinct groups in the register, so a dropdown that
// long is worse than typing. The datalist still surfaces existing values as you
// type, which is most of the reuse benefit without the scrolling.
function Suggest({ name, value, onChange, options, placeholder }: {
  name: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
}) {
  const listId = `sug-${name.replace(/\s+/g, "-").toLowerCase()}`
  return (
    <div>
      <label style={label}>{name}</label>
      <Input style={field} value={value} list={listId} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
      <datalist id={listId}>
        {options.map((o) => <option key={o} value={o} />)}
      </datalist>
    </div>
  )
}

const empty = {
  fullname: "", gender: "", group: "", email: "", phoneNumber: "",
  county: "", subCounty: "", projectType: "", landOwnershipType: "",
  idNumber: "", numberOfAcresCommitted: "",
}

export default function FarmerForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(empty)
  const [options, setOptions] = useState<Options | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  // Set when the server reports the ID number is already taken — resubmitting
  // with `force` is then an explicit choice, not an accident.
  const [duplicate, setDuplicate] = useState<{ fullname: string; county: string } | null>(null)

  useEffect(() => {
    fetch("/api/agro-forestry/options")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setOptions(d))
      .catch(() => {})
  }, [])

  const set = (k: keyof typeof empty) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setDuplicate(null)
  }

  const submit = async (force = false) => {
    setError(""); setSaving(true)
    try {
      const res = await fetch("/api/agro-forestry/farmers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, force }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409) { setDuplicate(data.duplicate ?? null); setError(data.error ?? "Duplicate ID number."); return }
      if (!res.ok) { setError(data.error ?? "Could not register the farmer."); return }
      onSaved()
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  const o = options ?? { counties: [], subCounties: [], projectTypes: [], landOwnershipTypes: [], groups: [] }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 60 }} />
      <aside style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(520px, 100%)",
        background: CARD, borderLeft: BORDER, zIndex: 61, overflowY: "auto", padding: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UserPlus size={20} color={GREEN} />
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>Register Farmer</h2>
              <p style={{ fontSize: 12, color: MUTED }}>Adds to the same register as the imported records</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: "#FDEDED", color: "#C0392B", padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14, display: "flex", gap: 8 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              {error}
              {duplicate && (
                <div style={{ marginTop: 8 }}>
                  <Button onClick={() => submit(true)} disabled={saving}
                    style={{ background: "#C0392B", color: "white", height: 30, fontSize: 12 }}>
                    Register anyway
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={label}>Full name<span style={{ color: "#C0392B" }}> *</span></label>
            <Input style={field} value={form.fullname} onChange={(e) => set("fullname")(e.target.value)} placeholder="e.g. Dama Furaha Katana" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Gender<span style={{ color: "#C0392B" }}> *</span></label>
              <select style={field} value={form.gender} onChange={(e) => set("gender")(e.target.value)}>
                <option value="">Select…</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label style={label}>ID number<span style={{ color: "#C0392B" }}> *</span></label>
              <Input style={field} value={form.idNumber} onChange={(e) => set("idNumber")(e.target.value)} inputMode="numeric" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Choice name="County" required value={form.county} onChange={set("county")} options={o.counties} />
            <Choice name="Sub-county" value={form.subCounty} onChange={set("subCounty")} options={o.subCounties} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Choice name="Project type" required value={form.projectType} onChange={set("projectType")} options={o.projectTypes} />
            <Choice name="Land ownership" required value={form.landOwnershipType} onChange={set("landOwnershipType")} options={o.landOwnershipTypes} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Suggest name="Group" value={form.group} onChange={set("group")} options={o.groups} placeholder="Start typing…" />
            <div>
              <label style={label}>Acres committed</label>
              <Input style={field} type="number" min="0" step="0.01" value={form.numberOfAcresCommitted}
                onChange={(e) => set("numberOfAcresCommitted")(e.target.value)} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Phone</label>
              <Input style={field} value={form.phoneNumber} onChange={(e) => set("phoneNumber")(e.target.value)} placeholder="07…" />
            </div>
            <div>
              <label style={label}>Email</label>
              <Input style={field} type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <Button onClick={() => submit(false)} disabled={saving}
            style={{ background: GREEN, color: "white", gap: 6, flex: 1 }}>
            {saving && <Loader2 size={16} className="animate-spin" />} Register Farmer
          </Button>
          <Button onClick={onClose} disabled={saving}
            style={{ background: CARD, color: TEXT, border: BORDER }}>
            Cancel
          </Button>
        </div>

        <p style={{ fontSize: 11, color: MUTED, marginTop: 12, lineHeight: 1.5 }}>
          Dropdowns list values already used in the register, most common first. Pick an
          existing one where it fits — choose <em>Other</em> only for a genuinely new value.
        </p>
      </aside>
    </>
  )
}
