"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Loader2, Check, X, Lock, CircleDot, CircleCheck, MapPin } from "lucide-react"
import ImageUploader from "@/components/admin/ImageUploader"
import { STAGES, STAGE_LABELS, STAGE_ROLES, ROLE_LABELS, stageIndex, COST_FIELDS, NOT_ALLOWED, type Stage } from "@/lib/tracing-stages"

// Stages that carry cost figures — used to show the redaction notice to non-admins.
const STAGES_WITH_COST = new Set<Stage>(["bulk_request", "sourcing", "production", "dispatch"])

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const RED = "#C0392B"
const ksh = (n: number) => `KSh ${n.toLocaleString()}`

type FormState = Record<string, string | string[]>
const sval = (f: FormState, k: string) => (typeof f[k] === "string" ? (f[k] as string) : "")
const nval = (f: FormState, k: string) => Number(sval(f, k)) || 0

type FieldType = "text" | "number" | "date" | "textarea" | "images" | "gps" | "computed"
interface FieldDef { name: string; label: string; type?: FieldType; compute?: (f: FormState) => string }

// Declarative form config per generic stage (approval + requisition are special).
const STAGE_FIELDS: Partial<Record<Stage, FieldDef[]>> = {
  sourcing: [
    { name: "materialName", label: "Material Name" },
    { name: "sourceLocation", label: "Source Location" },
    { name: "gps", label: "GPS Coordinates", type: "gps" },
    { name: "quantityHarvested", label: "Quantity Harvested", type: "number" },
    { name: "laborCost", label: "Labor Cost", type: "number" },
    { name: "transportCost", label: "Transport Cost", type: "number" },
    { name: "otherCosts", label: "Other Costs", type: "number" },
    { name: "supervisor", label: "Supervisor" },
    { name: "images", label: "Images", type: "images" },
    { name: "remarks", label: "Remarks", type: "textarea" },
  ],
  inspection: [
    { name: "materialName", label: "Material Name" },
    { name: "quantityDelivered", label: "Quantity Delivered", type: "number" },
    { name: "quantityRejected", label: "Quantity Rejected", type: "number" },
    { name: "quantityAccepted", label: "Quantity Accepted (auto = delivered − rejected)", type: "computed", compute: (f) => String(Math.max(0, nval(f, "quantityDelivered") - nval(f, "quantityRejected"))) },
    { name: "qualityGrade", label: "Quality Grade" },
    { name: "inspector", label: "Inspector" },
    { name: "storeLocation", label: "Store Location", type: "gps" },
    { name: "images", label: "Images", type: "images" },
  ],
  issuance: [
    { name: "department", label: "Department" },
    { name: "product", label: "Product" },
    { name: "customProductOrSample", label: "Custom Product or Sample" },
    { name: "numberToManufacture", label: "No. of Products to Manufacture", type: "number" },
    { name: "material", label: "Material" },
    { name: "quantityRequired", label: "Quantity Required", type: "number" },
    { name: "jobCardNumber", label: "Job Card Number" },
    { name: "requestedBy", label: "Requested By" },
    { name: "approvedBy", label: "Approved By" },
    { name: "productImage", label: "Product Image", type: "images" },
    { name: "purpose", label: "Purpose", type: "textarea" },
  ],
  production: [
    { name: "material", label: "Material" },
    { name: "quantityIssued", label: "Quantity Issued", type: "number" },
    { name: "unitCost", label: "Unit Cost", type: "number" },
    { name: "issuedBy", label: "Issued By" },
    { name: "receivedBy", label: "Received By" },
    { name: "date", label: "Date", type: "date" },
  ],
  dispatch: [
    { name: "product", label: "Product" },
    { name: "quantity", label: "Quantity", type: "number" },
    { name: "sourceLocation", label: "Source Location" },
    { name: "destination", label: "Destination" },
    { name: "transportCost", label: "Transport Cost", type: "number" },
    { name: "dispatchedBy", label: "Dispatched By" },
    { name: "toBeReceivedBy", label: "To Be Received By" },
    { name: "date", label: "Date", type: "date" },
  ],
  receiving: [
    { name: "product", label: "Product" },
    { name: "quantityReceived", label: "Quantity Received", type: "number" },
    { name: "condition", label: "Condition" },
    { name: "variance", label: "Variance", type: "number" },
    { name: "receiver", label: "Receiver" },
    { name: "images", label: "Images", type: "images" },
    { name: "remarks", label: "Remarks", type: "textarea" },
  ],
}

const RECORD_KEY: Record<Stage, string> = {
  bulk_request: "bulkRequest", approval: "approval", sourcing: "sourcing",
  inspection: "inspection", requisition: "requisitions", issuance: "issuance",
  production: "production", dispatch: "dispatch", receiving: "receiving",
}

const field: React.CSSProperties = { width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT }
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 4, display: "block" }

const HIDDEN_KEYS = new Set(["id", "batchId", "createdAt", "images", "productImage"])
function prettyKey(k: string) { return k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()) }
function isHttp(s: unknown) { return typeof s === "string" && /^https?:\/\//.test(s) }

interface Reconciliation {
  totalCost: number
  costBreakdown: { harvest: number; production: number; dispatch: number }
  units: number
  costPerUnit: number
  matchedProductId: string | null
  matchedProductName: string | null
  matchConfidence: number
  tiers: { tier: string; sellingPrice: number; margin: number; marginPct: number; verdict: string }[]
  warnings: string[]
  reconcilable: boolean
}

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || "merchant"
  const isAdmin = role === "admin" || role === "it_specialist"

  const [batch, setBatch] = useState<Record<string, unknown> | null>(null)
  const [recon, setRecon] = useState<Reconciliation | null>(null)
  const [products, setProducts] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    // Reconciliation (costs/profit) is admin-only; non-admins never fetch it.
    const bRes = await fetch(`/api/tracing/batches/${id}`)
    if (bRes.ok) setBatch(await bRes.json())
    if (isAdmin) {
      const rRes = await fetch(`/api/tracing/batches/${id}/reconcile`)
      if (rRes.ok) setRecon(await rRes.json())
    }
    setLoading(false)
  }, [id, isAdmin])
  useEffect(() => { load() }, [load])
  useEffect(() => { fetch("/api/products").then((r) => r.ok && r.json()).then((p) => p && setProducts(p)).catch(() => {}) }, [])

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
  if (!batch) return <div style={{ padding: 40, color: MUTED }}>Batch not found. <Link href="/admin/tracing" style={{ color: GREEN }}>Back</Link></div>

  const currentStage = batch.stage as Stage
  const status = batch.status as string
  const currentIdx = stageIndex(currentStage)
  const inspection = batch.inspection as { quantityAccepted?: number } | null
  const requisitions = (batch.requisitions as { quantityRequired?: number }[]) ?? []
  const acceptedTotal = Number(inspection?.quantityAccepted) || 0
  const reqUsed = requisitions.reduce((s, r) => s + (Number(r.quantityRequired) || 0), 0)
  const acceptedRemaining = Math.max(0, acceptedTotal - reqUsed)

  const submit = async (stage: Stage, action: string, data: Record<string, unknown>) => {
    setError(""); setSaving(true)
    try {
      const res = await fetch(`/api/tracing/batches/${id}/stage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, action, data }),
      })
      const out = await res.json()
      if (!res.ok) { setError(out.error || "Could not save."); return }
      setForm({})
      await load()
    } catch { setError("Network error.") }
    finally { setSaving(false) }
  }

  // Build the payload from `form` — images stay arrays, computed fields are derived.
  const buildData = (fields: FieldDef[]) => {
    const data: Record<string, unknown> = {}
    for (const f of fields) {
      if (f.type === "images") data[f.name] = Array.isArray(form[f.name]) ? form[f.name] : []
      else if (f.type === "computed") data[f.name] = f.compute ? f.compute(form) : ""
      else data[f.name] = sval(form, f.name)
    }
    return data
  }

  const overrideProduct = async (productId: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/tracing/batches/${id}/reconcile`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: productId || null }),
      })
      if (res.ok) setRecon(await res.json())
    } finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <Link href="/admin/tracing" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 13, textDecoration: "none", marginBottom: 14 }}>
        <ArrowLeft size={15} /> All batches
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>{batch.code as string}</h1>
        <span style={{ background: status === "completed" ? GREEN : status === "rejected" ? RED : "#8C6A4A", color: "white", fontSize: 12, fontWeight: 600, padding: "3px 11px", borderRadius: 999, textTransform: "capitalize" }}>
          {status.replace("_", " ")}
        </span>
        <span style={{ fontSize: 13, color: MUTED }}>{(batch.productName as string) || ""}</span>
      </div>

      {error && <div style={{ background: "#FDEDED", color: RED, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {status === "rejected" && batch.approval ? (
        <div style={{ background: "#FDEDED", border: `1px solid ${RED}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: RED, marginBottom: 4 }}>Rejected by Executive</div>
          <div style={{ fontSize: 13, color: TEXT }}>{(batch.approval as { reason?: string }).reason || "No reason given."}</div>
        </div>
      ) : null}

      {/* Stepper */}
      <div style={{ display: "grid", gap: 12 }}>
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentIdx || (status === "completed" && idx <= currentIdx)
          const isCurrent = stage === currentStage && status === "in_progress"
          const canAct = isCurrent && (role === "admin" || role === STAGE_ROLES[stage])
          const record = batch[RECORD_KEY[stage]]
          const hasRecord = stage === "requisition" ? Array.isArray(record) && record.length > 0 : !!record

          const dotColor = isDone || hasRecord ? GREEN : isCurrent ? "#D9A441" : "#D6CEC2"
          const Icon = isDone || hasRecord ? CircleCheck : isCurrent ? CircleDot : Lock

          return (
            <div key={stage} style={{ background: "var(--admin-card)", border: `1px solid ${isCurrent ? "#D9A441" : "var(--admin-border)"}`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: hasRecord || canAct ? 12 : 0 }}>
                <Icon size={20} color={dotColor} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: TEXT, fontSize: 15 }}>{idx + 1}. {STAGE_LABELS[stage]}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{ROLE_LABELS[STAGE_ROLES[stage]]}</div>
                </div>
                {isCurrent && !canAct && (
                  <span style={{ fontSize: 12, color: "#B8860B", fontWeight: 600 }}>Waiting on {ROLE_LABELS[STAGE_ROLES[stage]]}</span>
                )}
              </div>

              {/* Read-only requisition rows */}
              {hasRecord && stage === "requisition" && (
                <div style={{ display: "grid", gap: 6 }}>
                  {(record as Record<string, unknown>[]).map((r, i) => (
                    <div key={i} style={{ fontSize: 13, color: TEXT, background: "var(--admin-card-2)", borderRadius: 8, padding: "8px 10px" }}>
                      <b>{r.requisitionId as string}</b> — {r.product as string} × {r.quantityRequired as number} · {r.department as string} · by {r.requestedBy as string}
                    </div>
                  ))}
                </div>
              )}

              {/* Read-only generic record */}
              {hasRecord && stage !== "requisition" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "6px 16px" }}>
                    {Object.entries(record as Record<string, unknown>)
                      .filter(([k, v]) => !HIDDEN_KEYS.has(k) && v !== null && v !== "" && k !== "status")
                      .map(([k, v]) => (
                        <div key={k} style={{ fontSize: 13 }}>
                          <span style={{ color: MUTED }}>{prettyKey(k)}: </span>
                          <span style={{ color: TEXT, fontWeight: 500 }}>{String(v)}</span>
                        </div>
                      ))}
                  </div>
                  {!isAdmin && STAGES_WITH_COST.has(stage) && (
                    <div style={{ marginTop: 8, fontSize: 12.5, color: "#8a6d00", fontStyle: "italic" }}>Costs: {NOT_ALLOWED}</div>
                  )}
                  <ImageThumbs urls={[...((record as Record<string, unknown>).images as string[] ?? []), ...((record as Record<string, unknown>).productImage as string[] ?? [])]} />
                </>
              )}

              {/* Editable actions */}
              {canAct && stage === "approval" && <ApprovalForm saving={saving} onSubmit={submit} />}
              {canAct && stage === "requisition" && (
                <RequisitionForm
                  saving={saving} hasRows={hasRecord}
                  acceptedTotal={acceptedTotal} acceptedRemaining={acceptedRemaining}
                  defaultProduct={(batch.productName as string) || ""}
                  onAdd={(data) => submit("requisition", "add", data)}
                  onProceed={() => submit("requisition", "advance", {})}
                />
              )}
              {canAct && STAGE_FIELDS[stage] && (
                <div style={{ marginTop: 12 }}>
                  {!isAdmin && STAGE_FIELDS[stage]!.some((fd) => COST_FIELDS.has(fd.name)) && (
                    <div style={{ marginBottom: 10, fontSize: 12.5, color: "#8a6d00", fontStyle: "italic" }}>Cost fields are hidden — {NOT_ALLOWED}</div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                    {STAGE_FIELDS[stage]!.filter((fd) => isAdmin || !COST_FIELDS.has(fd.name)).map((fd) => (
                      <div key={fd.name} style={fd.type === "textarea" || fd.type === "images" ? { gridColumn: "1 / -1" } : undefined}>
                        <label style={label}>{fd.label}</label>
                        {fd.type === "images" ? (
                          <ImageUploader value={(form[fd.name] as string[]) ?? []} onChange={(v) => setForm({ ...form, [fd.name]: v })} />
                        ) : fd.type === "gps" ? (
                          <GpsField value={sval(form, fd.name)} onChange={(v) => setForm({ ...form, [fd.name]: v })} />
                        ) : fd.type === "computed" ? (
                          <Input style={{ ...field, background: "var(--admin-card-2)", fontWeight: 600 }} value={fd.compute ? fd.compute(form) : ""} readOnly />
                        ) : fd.type === "textarea" ? (
                          <textarea style={{ ...field, height: 64, padding: 10 }} value={sval(form, fd.name)} onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })} />
                        ) : (
                          <Input style={field} type={fd.type === "number" ? "number" : fd.type === "date" ? "date" : "text"}
                            value={sval(form, fd.name)} onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })} />
                        )}
                      </div>
                    ))}
                  </div>
                  <Button onClick={() => submit(stage, "submit", buildData(STAGE_FIELDS[stage]!))} disabled={saving} style={{ background: GREEN, color: "white", marginTop: 12, gap: 6 }}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Submit & Advance
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Profit / loss reconciliation — admin only */}
      {!isAdmin && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginTop: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: TEXT, marginBottom: 8 }}>Profit / Loss Reconciliation</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8a6d00", fontSize: 13.5 }}>
            <Lock size={15} /> {NOT_ALLOWED}
          </div>
        </div>
      )}
      {isAdmin && recon && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginTop: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: TEXT, marginBottom: 14 }}>Profit / Loss Reconciliation</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
            <Stat label="Total Cost" value={ksh(recon.totalCost)} />
            <Stat label="Units" value={String(recon.units)} />
            <Stat label="Cost / Unit" value={ksh(recon.costPerUnit)} />
            <Stat label="Harvest / Prod / Dispatch" value={`${recon.costBreakdown.harvest} / ${recon.costBreakdown.production} / ${recon.costBreakdown.dispatch}`} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: MUTED }}>Matched website product:</span>
            <b style={{ color: TEXT, fontSize: 13 }}>{recon.matchedProductName || "— none —"}</b>
            {recon.matchedProductName && recon.matchConfidence < 1 && (
              <span style={{ fontSize: 11, color: "#B8860B" }}>{Math.round(recon.matchConfidence * 100)}% auto-match</span>
            )}
            <select value={recon.matchedProductId ?? ""} onChange={(e) => overrideProduct(e.target.value)} style={{ ...field, width: "auto", minWidth: 200, height: 36 }}>
              <option value="">— override / pick product —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {recon.tiers.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: MUTED, textAlign: "left" }}>
                  <th style={{ padding: "6px 8px" }}>Tier</th><th style={{ padding: "6px 8px" }}>Selling Price</th>
                  <th style={{ padding: "6px 8px" }}>Margin / Unit</th><th style={{ padding: "6px 8px" }}>Margin %</th><th style={{ padding: "6px 8px" }}>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {recon.tiers.map((t) => (
                  <tr key={t.tier} style={{ borderTop: "1px solid var(--admin-border)" }}>
                    <td style={{ padding: "8px", textTransform: "capitalize", fontWeight: 600, color: TEXT }}>{t.tier}</td>
                    <td style={{ padding: "8px" }}>{ksh(t.sellingPrice)}</td>
                    <td style={{ padding: "8px", color: t.margin < 0 ? RED : GREEN, fontWeight: 600 }}>{ksh(t.margin)}</td>
                    <td style={{ padding: "8px", color: t.margin < 0 ? RED : GREEN }}>{t.marginPct}%</td>
                    <td style={{ padding: "8px" }}>
                      <span style={{ background: t.verdict === "loss" ? RED : t.verdict === "profit" ? GREEN : MUTED, color: "white", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999, textTransform: "capitalize" }}>{t.verdict}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ fontSize: 13, color: MUTED }}>Link a website product to compute profit/loss.</div>
          )}
          {recon.warnings.length > 0 && (
            <div style={{ marginTop: 16 }}>
              {recon.warnings.map((w, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: w.includes("LOSS") ? RED : "#8a6d00", padding: "4px 0" }}><span>•</span> {w}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label: l, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--admin-card-2)", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: MUTED }}>{l}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{value}</div>
    </div>
  )
}

// Read-only image thumbnails for completed stages.
function ImageThumbs({ urls }: { urls: string[] }) {
  const valid = urls.filter(isHttp)
  if (valid.length === 0) return null
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      {valid.map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={u} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid var(--admin-border)" }} />
      ))}
    </div>
  )
}

// Location field: manual entry + "Use my location" geolocation.
function GpsField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const pick = () => {
    if (!navigator.geolocation) { setErr("Geolocation not supported on this device."); return }
    setBusy(true); setErr("")
    navigator.geolocation.getCurrentPosition(
      (p) => { onChange(`${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`); setBusy(false) },
      (e) => { setErr(e.message || "Couldn't get location."); setBusy(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }
  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <Input style={{ ...field, flex: 1 }} placeholder="lat, lng or type manually" value={value} onChange={(e) => onChange(e.target.value)} />
        <Button type="button" onClick={pick} disabled={busy} style={{ background: GREEN, color: "white", height: 40, gap: 6, whiteSpace: "nowrap" }}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />} {busy ? "Locating…" : "Use my location"}
        </Button>
      </div>
      {err && <div style={{ fontSize: 12, color: RED, marginTop: 4 }}>{err}</div>}
    </div>
  )
}

function ApprovalForm({ saving, onSubmit }: { saving: boolean; onSubmit: (s: Stage, a: string, d: Record<string, unknown>) => void }) {
  const [reason, setReason] = useState("")
  const [approvedBy, setApprovedBy] = useState("")
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
        <div><label style={label}>Approved / Decided By</label><Input style={field} value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} /></div>
        <div><label style={label}>Reason (required to reject)</label><Input style={field} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Button onClick={() => onSubmit("approval", "accept", { approvedBy })} disabled={saving} style={{ background: GREEN, color: "white", gap: 6 }}><Check size={16} /> Accept</Button>
        <Button onClick={() => onSubmit("approval", "reject", { approvedBy, reason })} disabled={saving} style={{ background: RED, color: "white", gap: 6 }}><X size={16} /> Reject</Button>
      </div>
    </div>
  )
}

function RequisitionForm({ saving, onAdd, onProceed, hasRows, acceptedTotal, acceptedRemaining, defaultProduct }: {
  saving: boolean; onAdd: (data: Record<string, unknown>) => void; onProceed: () => void
  hasRows: boolean; acceptedTotal: number; acceptedRemaining: number; defaultProduct: string
}) {
  const [r, setR] = useState({ department: "", product: defaultProduct, quantityRequired: acceptedRemaining ? String(acceptedRemaining) : "", requestedBy: "", purpose: "" })
  const [err, setErr] = useState("")

  const add = () => {
    const qty = Number(r.quantityRequired) || 0
    if (!r.product.trim()) { setErr("Product is required."); return }
    if (qty <= 0) { setErr("Enter a quantity."); return }
    if (acceptedTotal > 0 && qty > acceptedRemaining) { setErr(`Only ${acceptedRemaining} accepted units remain — you can't requisition more than what was accepted.`); return }
    setErr("")
    onAdd(r)
    setR({ department: "", product: defaultProduct, quantityRequired: "", requestedBy: "", purpose: "" })
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>
        {acceptedTotal > 0
          ? <>Accepted by QC: <b style={{ color: TEXT }}>{acceptedTotal}</b> · Remaining to requisition: <b style={{ color: acceptedRemaining ? GREEN : RED }}>{acceptedRemaining}</b>. Multiple officers can each add rows, then click Proceed.</>
          : <>Multiple requisition officers can each add rows. Click Proceed when done.</>}
      </div>
      {err && <div style={{ background: "#FDEDED", color: RED, padding: "7px 10px", borderRadius: 8, fontSize: 12, marginBottom: 8 }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <div><label style={label}>Department</label><Input style={field} value={r.department} onChange={(e) => setR({ ...r, department: e.target.value })} /></div>
        <div><label style={label}>Product</label><Input style={field} value={r.product} onChange={(e) => setR({ ...r, product: e.target.value })} /></div>
        <div><label style={label}>Quantity Required{acceptedTotal > 0 ? ` (max ${acceptedRemaining})` : ""}</label>
          <Input style={field} type="number" max={acceptedTotal > 0 ? acceptedRemaining : undefined} value={r.quantityRequired} onChange={(e) => setR({ ...r, quantityRequired: e.target.value })} /></div>
        <div><label style={label}>Requested By</label><Input style={field} value={r.requestedBy} onChange={(e) => setR({ ...r, requestedBy: e.target.value })} /></div>
        <div><label style={label}>Purpose</label><Input style={field} value={r.purpose} onChange={(e) => setR({ ...r, purpose: e.target.value })} /></div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <Button onClick={add} disabled={saving} style={{ background: "#8C6A4A", color: "white", gap: 6 }}>Add Requisition</Button>
        <Button onClick={onProceed} disabled={saving || !hasRows} style={{ background: GREEN, color: "white", gap: 6 }}>Proceed to Issuance</Button>
      </div>
    </div>
  )
}
