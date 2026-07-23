"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Loader2, Check, Lock, CircleDot, CircleCheck } from "lucide-react"
import ImageUploader from "@/components/admin/ImageUploader"
import { STAGES, STAGE_LABELS, stageIndex, type Stage } from "@/lib/fungiculture-stages"
import { isAdminishRole } from "@/lib/tracing-stages"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const RED = "#C0392B"
const AMBER = "#D9A441"

type FormState = Record<string, string | string[]>
const sval = (f: FormState, k: string) => (typeof f[k] === "string" ? (f[k] as string) : "")

type FieldType = "text" | "number" | "date" | "textarea" | "images" | "select"
interface FieldDef { name: string; label: string; type?: FieldType; readOnly?: boolean; options?: { value: string; label: string }[] }

interface GrowingHouseOption { id: string; name: string; code: string; status: string; maxBagCapacity: number; activeIncubationCount: number }

const RECORD_KEY: Record<Stage, string> = {
  substrate_prep: "substrate", incubation: "incubation", harvest: "harvest", dehydration_packaging: "dehydration",
}

const field: React.CSSProperties = { width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT }
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 4, display: "block" }

const HIDDEN_KEYS = new Set(["id", "batchId", "createdAt", "images", "growingHouseId"])
function prettyKey(k: string) { return k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()) }

function fmtDateTime(v: unknown): string | null {
  if (typeof v !== "string" && !(v instanceof Date)) return null
  const d = new Date(v as string)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString("en-KE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
}
function isDateKey(k: string) { return /At$/.test(k) }

export default function FungiBatchDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || "merchant"
  const isCeo = role === "admin" || role === "assistant_ceo"
  const isAdmin = isAdminishRole(role)
  const userName = (session?.user?.name as string) || ""

  const [batch, setBatch] = useState<Record<string, unknown> | null>(null)
  const [growingHouses, setGrowingHouses] = useState<GrowingHouseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    const res = await fetch(`/api/fungiculture/batches/${id}`)
    if (res.ok) setBatch(await res.json())
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch("/api/fungiculture/growing-houses")
      .then((r) => (r.ok ? r.json() : []))
      .then((houses: GrowingHouseOption[]) => setGrowingHouses(houses.filter((h) => h.status === "active")))
      .catch(() => {})
  }, [])

  // Auto-fill "harvested by" once the harvest stage is reached.
  useEffect(() => {
    if (!batch || !userName) return
    if (batch.stage === "harvest" && !form.harvestedBy) {
      setForm((prev) => ({ ...prev, harvestedBy: userName }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.stage, userName])

  const STAGE_FIELDS: Partial<Record<Stage, FieldDef[]>> = {
    incubation: [
      { name: "inoculatedAt", label: "Inoculated", type: "date" },
      { name: "hangAt", label: "Hung", type: "date" },
      {
        name: "growingHouseId", label: "Growing House", type: "select",
        options: growingHouses.map((h) => ({
          value: h.id,
          label: `${h.name}${h.maxBagCapacity > 0 ? ` (${h.activeIncubationCount}/${h.maxBagCapacity} bags)` : ""}`,
        })),
      },
      { name: "pinningAt", label: "Pinning Observed", type: "date" },
      { name: "images", label: "Images", type: "images" },
      { name: "remarks", label: "Remarks", type: "textarea" },
    ],
    harvest: [
      { name: "totalWeightKg", label: "Total Weight (kg)", type: "number" },
      { name: "freshPunnets250g", label: "Fresh Punnets (250g)", type: "number" },
      { name: "weightForDryingKg", label: "Weight For Drying (kg)", type: "number" },
      { name: "harvestedBy", label: "Harvested By", readOnly: true },
      { name: "images", label: "Images", type: "images" },
      { name: "remarks", label: "Remarks", type: "textarea" },
    ],
    dehydration_packaging: [
      { name: "driedAt", label: "Dried On", type: "date" },
      { name: "driedWeightKg", label: "Dried Weight (kg)", type: "number" },
      { name: "packagingType", label: "Packaging Type" },
      { name: "packagedUnits", label: "Packaged Units", type: "number" },
      { name: "remarks", label: "Remarks", type: "textarea" },
    ],
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
  if (!batch) return <div style={{ padding: 40, color: MUTED }}>Batch not found. <Link href="/admin/fungiculture" style={{ color: GREEN }}>Back</Link></div>

  const currentStage = batch.stage as Stage
  const status = batch.status as string
  const currentIdx = stageIndex(currentStage)
  const canAct = isCeo || role === "fungiculturist"

  const harvest = batch.harvest as { weightForDryingKg?: number } | null
  const dehydration = batch.dehydration as { driedWeightKg?: number } | null
  const shrinkagePercent =
    harvest && dehydration && dehydration.driedWeightKg !== undefined && harvest.weightForDryingKg
      ? ((harvest.weightForDryingKg - (dehydration.driedWeightKg ?? 0)) / harvest.weightForDryingKg) * 100
      : null

  const overCapacityHouse = (() => {
    const houseId = sval(form, "growingHouseId")
    if (!houseId) return null
    const h = growingHouses.find((gh) => gh.id === houseId)
    if (!h || h.maxBagCapacity <= 0) return null
    return h.activeIncubationCount >= h.maxBagCapacity ? h : null
  })()

  const submit = async (stage: Stage, data: Record<string, unknown>) => {
    setError(""); setSaving(true)
    try {
      const res = await fetch(`/api/fungiculture/batches/${id}/stage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, data }),
      })
      const out = await res.json()
      if (!res.ok) { setError(out.error || "Could not save."); return }
      setForm({})
      await load()
    } catch { setError("Network error.") }
    finally { setSaving(false) }
  }

  const buildData = (fields: FieldDef[]) => {
    const data: Record<string, unknown> = {}
    for (const f of fields) {
      if (f.type === "images") data[f.name] = Array.isArray(form[f.name]) ? form[f.name] : []
      else data[f.name] = sval(form, f.name)
    }
    return data
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <Link href="/admin/fungiculture" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 13, textDecoration: "none", marginBottom: 14 }}>
        <ArrowLeft size={15} /> All batches
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>{batch.code as string}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <span style={{ background: status === "completed" ? GREEN : "#8C6A4A", color: "white", fontSize: 12, fontWeight: 600, padding: "3px 11px", borderRadius: 999, textTransform: "capitalize" }}>
              {status.replace("_", " ")}
            </span>
            {isAdmin && batch.spawnId ? <span style={{ fontSize: 12, color: MUTED }}>Spawn: {batch.spawnId as string}</span> : null}
            {shrinkagePercent !== null && (
              <span style={{ fontSize: 12, color: MUTED }}>Drying yield: <b style={{ color: TEXT }}>{shrinkagePercent.toFixed(1)}%</b> retained</span>
            )}
          </div>
        </div>
      </div>

      {error && <div style={{ background: "#FDEDED", color: RED, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentIdx || (status === "completed" && idx <= currentIdx)
          const isCurrent = stage === currentStage && status === "in_progress"
          const record = batch[RECORD_KEY[stage]]
          const hasRecord = !!record

          const dotColor = isDone || hasRecord ? GREEN : isCurrent ? AMBER : "#D6CEC2"
          const Icon = isDone || hasRecord ? CircleCheck : isCurrent ? CircleDot : Lock

          return (
            <div key={stage} style={{ background: "var(--admin-card)", border: `1px solid ${isCurrent ? AMBER : "var(--admin-border)"}`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: hasRecord || (isCurrent && canAct) ? 12 : 0 }}>
                <Icon size={20} color={dotColor} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: TEXT, fontSize: 15 }}>{idx + 1}. {STAGE_LABELS[stage]}</div>
                </div>
                {isCurrent && !canAct && (
                  <span style={{ fontSize: 12, color: "#B8860B", fontWeight: 600 }}>Waiting on Fungiculturist</span>
                )}
              </div>

              {/* Read-only generic record */}
              {hasRecord && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "6px 16px" }}>
                    {Object.entries(record as Record<string, unknown>)
                      .filter(([k, v]) => !HIDDEN_KEYS.has(k) && v !== null && v !== "")
                      .map(([k, v]) => (
                        <div key={k} style={{ fontSize: 13 }}>
                          <span style={{ color: MUTED }}>{prettyKey(k)}: </span>
                          <span style={{ color: TEXT, fontWeight: 500 }}>{isDateKey(k) ? (fmtDateTime(v) ?? String(v)) : String(v)}</span>
                        </div>
                      ))}
                    {stage === "incubation" && (record as { growingHouseId?: string }).growingHouseId && (
                      <div style={{ fontSize: 13 }}>
                        <span style={{ color: MUTED }}>Growing House: </span>
                        <span style={{ color: TEXT, fontWeight: 500 }}>
                          {growingHouses.find((h) => h.id === (record as { growingHouseId?: string }).growingHouseId)?.name ?? "—"}
                        </span>
                      </div>
                    )}
                  </div>
                  {fmtDateTime((record as Record<string, unknown>).createdAt) && (
                    <div style={{ marginTop: 8, fontSize: 12, color: MUTED }}>Recorded: <span style={{ color: TEXT, fontWeight: 600 }}>{fmtDateTime((record as Record<string, unknown>).createdAt)}</span></div>
                  )}
                  {Array.isArray((record as Record<string, unknown>).images) && ((record as { images: string[] }).images).length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      {(record as { images: string[] }).images.map((u, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={u} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid var(--admin-border)" }} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Editable form for the current stage */}
              {isCurrent && canAct && STAGE_FIELDS[stage] && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                    {STAGE_FIELDS[stage]!.map((fd) => (
                      <div key={fd.name} style={fd.type === "textarea" || fd.type === "images" ? { gridColumn: "1 / -1" } : undefined}>
                        <label style={labelStyle}>{fd.label}{fd.readOnly ? <span style={{ color: MUTED, fontWeight: 400 }}> · auto</span> : null}</label>
                        {fd.type === "images" ? (
                          <ImageUploader value={(form[fd.name] as string[]) ?? []} onChange={(v) => setForm({ ...form, [fd.name]: v })} />
                        ) : fd.type === "select" ? (
                          <select style={field} value={sval(form, fd.name)} onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })}>
                            <option value="">— none / not tracked —</option>
                            {(fd.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : fd.readOnly ? (
                          <Input style={{ ...field, background: "var(--admin-card-2)", fontWeight: 600 }} value={sval(form, fd.name)} readOnly />
                        ) : fd.type === "textarea" ? (
                          <textarea style={{ ...field, height: 64, padding: 10 }} value={sval(form, fd.name)} onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })} />
                        ) : (
                          <Input style={field} type={fd.type === "number" ? "number" : fd.type === "date" ? "date" : "text"}
                            value={sval(form, fd.name)} onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })} />
                        )}
                        {fd.name === "growingHouseId" && overCapacityHouse && (
                          <div style={{ fontSize: 11, color: "#B8860B", marginTop: 4 }}>
                            {overCapacityHouse.name} is at or over capacity ({overCapacityHouse.activeIncubationCount}/{overCapacityHouse.maxBagCapacity}) — you can still assign it.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button onClick={() => submit(stage, buildData(STAGE_FIELDS[stage]!))} disabled={saving} style={{ background: GREEN, color: "white", marginTop: 12, gap: 6 }}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Submit & Advance
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
