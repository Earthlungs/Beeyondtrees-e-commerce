"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Loader2, Check, X, Lock, CircleDot, CircleCheck, MapPin, Plus, Trash2 } from "lucide-react"
import ImageUploader from "@/components/admin/ImageUploader"
import ProductionProgress from "@/components/admin/ProductionProgress"
import { STAGES, STAGE_LABELS, STAGE_ROLES, ROLE_LABELS, stageIndex, COST_FIELDS, NOT_ALLOWED, isAdminishRole, type Stage } from "@/lib/tracing-stages"

const STAGES_WITH_COST = new Set<Stage>(["bulk_request", "sourcing", "production", "dispatch"])

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const RED = "#C0392B"
const AMBER = "#D97706"
const ksh = (n: number) => `KSh ${n.toLocaleString()}`

type FormState = Record<string, string | string[]>
const sval = (f: FormState, k: string) => (typeof f[k] === "string" ? (f[k] as string) : "")
const nval = (f: FormState, k: string) => Number(sval(f, k)) || 0

type FieldType = "text" | "number" | "date" | "textarea" | "images" | "gps" | "computed" | "product-name"
// `readOnly` fields are auto-filled (logged-in person / carried from a prior stage)
// and shown locked so the user can't retype them.
interface FieldDef { name: string; label: string; type?: FieldType; compute?: (f: FormState) => string; readOnly?: boolean }

const STAGE_FIELDS: Partial<Record<Stage, FieldDef[]>> = {
  sourcing: [
    { name: "materialName", label: "Material Name", type: "product-name" },
    { name: "sourceLocation", label: "Source Location" },
    { name: "gps", label: "GPS Coordinates", type: "gps" },
    { name: "quantityHarvested", label: "Quantity Harvested", type: "number" },
    { name: "laborCost", label: "Labor Cost", type: "number" },
    { name: "transportCost", label: "Transport Cost", type: "number" },
    { name: "otherCosts", label: "Other Costs", type: "number" },
    { name: "images", label: "Images", type: "images" },
    { name: "remarks", label: "Remarks", type: "textarea" },
  ],
  inspection: [
    { name: "materialName", label: "Material Name", type: "product-name" },
    { name: "quantityDelivered", label: "Quantity Delivered", type: "number" },
    { name: "quantityRejected", label: "Quantity Rejected", type: "number" },
    { name: "quantityAccepted", label: "Quantity Accepted (auto = delivered − rejected)", type: "computed", compute: (f) => String(Math.max(0, nval(f, "quantityDelivered") - nval(f, "quantityRejected"))) },
    { name: "qualityGrade", label: "Quality Grade" },
    { name: "inspector", label: "Inspected By", readOnly: true },
    { name: "storeLocation", label: "Store Location", type: "gps" },
    { name: "images", label: "Images", type: "images" },
    { name: "remarks", label: "Remarks", type: "textarea" },
  ],
  // issuance is handled by IssuanceForm (auto-filled from the requisitions)
  // production is handled by ProductionForm (dynamic named cost lines)
  dispatch: [
    { name: "product", label: "Product", type: "product-name" },
    { name: "quantity", label: "Quantity", type: "number" },
    { name: "sourceLocation", label: "Source Location" },
    { name: "destination", label: "Destination" },
    { name: "transportCost", label: "Transport Cost", type: "number" },
    { name: "dispatchedBy", label: "Dispatched By", readOnly: true },
    { name: "date", label: "Dispatch Date", type: "date" },
    { name: "remarks", label: "Remarks", type: "textarea" },
  ],
  // receiving handled by ReceivingForm
}

const RECORD_KEY: Record<Stage, string> = {
  bulk_request: "bulkRequest", approval: "approval", sourcing: "sourcing",
  inspection: "inspection", requisition: "requisitions", issuance: "issuance",
  production: "production", dispatch: "dispatch", receiving: "receiving",
}

const field: React.CSSProperties = { width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT }
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 4, display: "block" }

const HIDDEN_KEYS = new Set(["id", "batchId", "createdAt", "images", "productImage", "costs", "quantityIssued", "unitCost"])
function prettyKey(k: string) { return k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()) }
function isHttp(s: unknown) { return typeof s === "string" && /^https?:\/\//.test(s) }

// Friendly timestamp — date + time + seconds, 24h, Kenya locale.
function fmtDateTime(v: unknown): string | null {
  if (typeof v !== "string" && !(v instanceof Date)) return null
  const d = new Date(v as string)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString("en-KE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
}
// Date-bearing keys we render as a friendly timestamp instead of a raw ISO string.
function isDateKey(k: string) { return k === "date" || /At$/.test(k) || k === "expectedDate" }

// Parse breakdown stored in `condition` field (JSON array or plain string)
function parseBreakdown(condition: string | null | undefined): { qty: number; condition: string; grade: string }[] | null {
  if (!condition) return null
  try {
    const p = JSON.parse(condition)
    if (Array.isArray(p) && p.length > 0 && typeof p[0] === "object") return p
    return null
  } catch { return null }
}

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
  const isAdmin = isAdminishRole(role)
  // CEO-level stage authority mirrors requireStage on the server (admin + Assistant
  // CEO may act on ANY stage; IT specialist does NOT get stage-acting rights).
  const isCeo = role === "admin" || role === "assistant_ceo"
  const userName = (session?.user?.name as string) || ""

  const [batch, setBatch] = useState<Record<string, unknown> | null>(null)
  const [recon, setRecon] = useState<Reconciliation | null>(null)
  const [products, setProducts] = useState<{ id: string; name: string; images: string[] }[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  // Live production completion (lifted from ProductionProgress) — gates the
  // "Submit & Advance" so production can't advance before it's 100% done.
  const [prodPercent, setProdPercent] = useState(0)

  const load = useCallback(async () => {
    const bRes = await fetch(`/api/tracing/batches/${id}`)
    if (bRes.ok) setBatch(await bRes.json())
    if (isAdmin) {
      const rRes = await fetch(`/api/tracing/batches/${id}/reconcile`)
      if (rRes.ok) setRecon(await rRes.json())
    }
    setLoading(false)
  }, [id, isAdmin])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch("/api/products").then((r) => r.ok && r.json()).then((p) => p && setProducts(p)).catch(() => {})
  }, [])

  // Auto-fill form fields when a stage becomes active for the current user
  useEffect(() => {
    if (!batch || !userName) return
    const stage = batch.stage as Stage
    if (role !== "admin" && role !== STAGE_ROLES[stage]) return

    const reqs = (batch.requisitions as { requestedBy?: string }[]) ?? []
    const productName = (batch.productName as string) || ""
    const prefill: FormState = {}

    switch (stage) {
      case "sourcing":
        if (productName && !form.materialName) prefill.materialName = productName
        break
      case "inspection":
        if (productName && !form.materialName) prefill.materialName = productName
        if (!form.inspector) prefill.inspector = userName
        break
      case "issuance": {
        const sector = (batch.bulkRequest as { sector?: string } | null)?.sector || ""
        if (!form.department && sector) prefill.department = sector
        if (!form.approvedBy) prefill.approvedBy = userName
        if (!form.requestedBy && reqs[0]?.requestedBy) prefill.requestedBy = reqs[0].requestedBy
        if (productName && !form.product) prefill.product = productName
        break
      }
      case "production":
        if (!form.issuedBy) prefill.issuedBy = userName
        if (productName && !form.material) prefill.material = productName
        break
      case "dispatch":
        if (!form.dispatchedBy) prefill.dispatchedBy = userName
        if (productName && !form.product) prefill.product = productName
        break
    }

    if (Object.keys(prefill).length > 0) setForm((prev) => ({ ...prefill, ...prev }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.stage, userName])

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
  if (!batch) return <div style={{ padding: 40, color: MUTED }}>Batch not found. <Link href="/admin/tracing" style={{ color: GREEN }}>Back</Link></div>

  const currentStage = batch.stage as Stage
  const status = batch.status as string
  const currentIdx = stageIndex(currentStage)
  const matchedProduct = products.find((p) => p.id === (batch.matchedProductId as string | null))
  const batchImage = matchedProduct?.images?.[0] || null
  const inspection = batch.inspection as { quantityAccepted?: number } | null
  const dispatch = batch.dispatch as { quantity?: number } | null
  const requisitions = (batch.requisitions as { quantityRequired?: number; requestedBy?: string }[]) ?? []
  const acceptedTotal = Number(inspection?.quantityAccepted) || 0
  const reqUsed = requisitions.reduce((s, r) => s + (Number(r.quantityRequired) || 0), 0)
  const acceptedRemaining = Math.max(0, acceptedTotal - reqUsed)
  const dispatchedQty = Number(dispatch?.quantity) || 0

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
        {batchImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={batchImage} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 10, border: "1px solid var(--admin-border)", flexShrink: 0 }} />
        )}
        <div>
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>{batch.code as string}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <span style={{ background: status === "completed" ? GREEN : status === "rejected" ? RED : "#8C6A4A", color: "white", fontSize: 12, fontWeight: 600, padding: "3px 11px", borderRadius: 999, textTransform: "capitalize" }}>
              {status.replace("_", " ")}
            </span>
            <span style={{ fontSize: 13, color: MUTED }}>{(batch.productName as string) || ""}</span>
          </div>
        </div>
      </div>

      {error && <div style={{ background: "#FDEDED", color: RED, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {status === "rejected" && batch.approval ? (
        <div style={{ background: "#FDEDED", border: `1px solid ${RED}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: RED, marginBottom: 4 }}>Rejected by Executive</div>
          <div style={{ fontSize: 13, color: TEXT }}>{(batch.approval as { reason?: string }).reason || "No reason given."}</div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 12 }}>
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentIdx || (status === "completed" && idx <= currentIdx)
          const isCurrent = stage === currentStage && status === "in_progress"
          // Receiving is done by whoever created the LPO (matched by name as a
          // fallback since the session has no user id) — not the legacy receiving_officer.
          const isReceivingCreator = stage === "receiving" && !!userName && batch["lpoCreatedByName"] === userName
          const canAct = isCurrent && (isCeo || role === STAGE_ROLES[stage] || isReceivingCreator)
          const record = batch[RECORD_KEY[stage]]
          const hasRecord = stage === "requisition" ? Array.isArray(record) && (record as unknown[]).length > 0 : !!record

          const dotColor = isDone || hasRecord ? GREEN : isCurrent ? "#D9A441" : "#D6CEC2"
          const Icon = isDone || hasRecord ? CircleCheck : isCurrent ? CircleDot : Lock

          // Requisition closed = all accepted units have been requisitioned
          const reqClosed = stage === "requisition" && acceptedTotal > 0 && acceptedRemaining === 0

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
                {isCurrent && canAct && reqClosed && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: RED, fontWeight: 700 }}>
                    <Lock size={13} /> Closed — all units requisitioned
                  </span>
                )}
              </div>

              {/* Production progress — live sub-stage timeline + % (graphical, all viewers).
                  Only once production is reached (current or past), so a future/locked
                  stage doesn't show a non-interactive panel. */}
              {stage === "production" && idx <= currentIdx && <ProductionProgress batchId={id} canLog={canAct} onPercent={setProdPercent} />}

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

              {/* Read-only receiving breakdown */}
              {hasRecord && stage === "receiving" && (
                <ReceivingDisplay record={record as Record<string, unknown>} />
              )}

              {/* Read-only generic record */}
              {hasRecord && stage !== "requisition" && stage !== "receiving" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "6px 16px" }}>
                    {Object.entries(record as Record<string, unknown>)
                      .filter(([k, v]) => !HIDDEN_KEYS.has(k) && v !== null && v !== "" && k !== "status")
                      .map(([k, v]) => (
                        <div key={k} style={{ fontSize: 13 }}>
                          <span style={{ color: MUTED }}>{prettyKey(k)}: </span>
                          <span style={{ color: TEXT, fontWeight: 500 }}>
                            {!isAdmin && COST_FIELDS.has(k) ? NOT_ALLOWED : (isDateKey(k) ? (fmtDateTime(v) ?? String(v)) : String(v))}
                          </span>
                        </div>
                      ))}
                  </div>
                  {fmtDateTime((record as Record<string, unknown>).createdAt) && (
                    <div style={{ marginTop: 8, fontSize: 12, color: MUTED }}>Recorded: <span style={{ color: TEXT, fontWeight: 600 }}>{fmtDateTime((record as Record<string, unknown>).createdAt)}</span></div>
                  )}
                  {/* Production overhead cost breakdown — admin only */}
                  {isAdmin && stage === "production" && Array.isArray((record as Record<string, unknown>).costs) && ((record as { costs: unknown[] }).costs).length > 0 && (
                    <div style={{ marginTop: 10, background: "var(--admin-card-2)", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 6 }}>Production costs</div>
                      {((record as { costs: { name: string; amount: number }[] }).costs).map((c, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
                          <span style={{ color: TEXT }}>{c.name || "—"}</span>
                          <span style={{ color: TEXT, fontWeight: 600 }}>{ksh(Number(c.amount) || 0)}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 800, borderTop: "1px solid var(--admin-border)", marginTop: 6, paddingTop: 6 }}>
                        <span style={{ color: TEXT }}>Total</span>
                        <span style={{ color: GREEN }}>{ksh(((record as { costs: { amount: number }[] }).costs).reduce((s, c) => s + (Number(c.amount) || 0), 0))}</span>
                      </div>
                    </div>
                  )}
                  {!isAdmin && STAGES_WITH_COST.has(stage) && (
                    <div style={{ marginTop: 8, fontSize: 12.5, color: "#8a6d00", fontStyle: "italic" }}>Costs: {NOT_ALLOWED}</div>
                  )}
                  <ImageThumbs urls={[...((record as Record<string, unknown>).images as string[] ?? []), ...((record as Record<string, unknown>).productImage as string[] ?? [])]} />
                  {stage === "bulk_request" && batchImage && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={batchImage} alt={matchedProduct?.name} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid var(--admin-border)" }} />
                      <div style={{ fontSize: 12, color: MUTED }}>Linked product: <span style={{ color: TEXT, fontWeight: 600 }}>{matchedProduct?.name}</span></div>
                    </div>
                  )}
                </>
              )}

              {/* Editable actions */}
              {canAct && stage === "approval" && <ApprovalForm saving={saving} userName={userName} onSubmit={submit} />}

              {canAct && stage === "requisition" && reqClosed && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: RED, fontSize: 13, marginBottom: 12 }}>
                    <Lock size={15} /> All {acceptedTotal} accepted units have been requisitioned. Ready to proceed.
                  </div>
                  <Button onClick={() => submit("requisition", "advance", {})} disabled={saving} style={{ background: GREEN, color: "white", gap: 6 }}>
                    <Check size={16} /> Proceed to Issuance
                  </Button>
                </div>
              )}

              {canAct && stage === "requisition" && !reqClosed && (
                <RequisitionForm
                  saving={saving} hasRows={hasRecord}
                  acceptedTotal={acceptedTotal} acceptedRemaining={acceptedRemaining}
                  defaultProduct={(batch.productName as string) || ""}
                  defaultDepartment={((batch.bulkRequest as { sector?: string } | null)?.sector) || ""}
                  userName={userName}
                  products={products}
                  onAdd={(data) => submit("requisition", "add", data)}
                  onProceed={() => submit("requisition", "advance", {})}
                />
              )}

              {canAct && stage === "issuance" && (
                <IssuanceForm
                  saving={saving}
                  requisitions={(batch.requisitions as IssuanceReq[]) ?? []}
                  onIssue={(requisitionId, quantity) => submit("issuance", "issue", { requisitionId, quantity })}
                  onProceed={() => submit("issuance", "advance", {})}
                />
              )}

              {canAct && stage === "production" && (
                <ProductionForm
                  saving={saving}
                  userName={userName}
                  percent={prodPercent}
                  defaultMaterial={(batch.productName as string) || ((batch.issuance as { material?: string } | null)?.material) || ""}
                  onSubmit={(data) => submit("production", "submit", data)}
                />
              )}

              {canAct && stage === "receiving" && (
                <ReceivingForm
                  saving={saving}
                  dispatchedQty={dispatchedQty}
                  productName={(batch.productName as string) || ""}
                  userName={userName}
                  onSubmit={(data) => submit("receiving", "submit", data)}
                />
              )}

              {canAct && STAGE_FIELDS[stage] && stage !== "receiving" && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                    {STAGE_FIELDS[stage]!.map((fd) => (
                      <div key={fd.name} style={fd.type === "textarea" || fd.type === "images" ? { gridColumn: "1 / -1" } : undefined}>
                        <label style={labelStyle}>{fd.label}{fd.readOnly ? <span style={{ color: MUTED, fontWeight: 400 }}> · auto</span> : null}</label>
                        {fd.type === "images" ? (
                          <ImageUploader value={(form[fd.name] as string[]) ?? []} onChange={(v) => setForm({ ...form, [fd.name]: v })} />
                        ) : fd.type === "gps" ? (
                          <GpsField value={sval(form, fd.name)} onChange={(v) => setForm({ ...form, [fd.name]: v })} />
                        ) : fd.type === "computed" ? (
                          <Input style={{ ...field, background: "var(--admin-card-2)", fontWeight: 600 }} value={fd.compute ? fd.compute(form) : ""} readOnly />
                        ) : fd.readOnly ? (
                          <Input style={{ ...field, background: "var(--admin-card-2)", fontWeight: 600 }} value={sval(form, fd.name)} readOnly />
                        ) : fd.type === "textarea" ? (
                          <textarea style={{ ...field, height: 64, padding: 10 }} value={sval(form, fd.name)} onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })} />
                        ) : fd.type === "product-name" ? (
                          <>
                            <Input style={field} type="text" value={sval(form, fd.name)} onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })} list={`plist-${fd.name}`} placeholder="Type or search product…" />
                            <datalist id={`plist-${fd.name}`}>
                              {products.map((p) => <option key={p.id} value={p.name} />)}
                            </datalist>
                          </>
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

interface IssuanceReq { id: string; requisitionId: string; department: string; product: string; quantityRequired: number; issuedQty?: number; requestedBy: string; status: string }

// Issuance is driven by the requisitions — the agribusiness manager doesn't fill
// a fresh form, they ISSUE against each requisition. Issuing is PARTIAL: a prompt
// asks how much is being issued; any shortfall stays "owing" until fully issued.
// Once every requisition is fully issued it locks with a padlock + Proceed.
function IssuanceForm({ saving, requisitions, onIssue, onProceed }: {
  saving: boolean
  requisitions: IssuanceReq[]
  onIssue: (requisitionId: string, quantity: number) => void
  onProceed: () => void
}) {
  // The "how much did you issue?" prompt (custom modal, not a browser alert).
  const [prompt, setPrompt] = useState<{ req: IssuanceReq; remaining: number } | null>(null)
  const [qty, setQty] = useState("")
  const [perr, setPerr] = useState("")

  const reqd = (r: IssuanceReq) => Number(r.quantityRequired) || 0
  const iss = (r: IssuanceReq) => Number(r.issuedQty) || 0
  const total = requisitions.reduce((s, r) => s + reqd(r), 0)
  const issuedTotal = requisitions.reduce((s, r) => s + iss(r), 0)
  const owing = Math.max(0, total - issuedTotal)
  const allIssued = requisitions.length > 0 && owing === 0

  if (requisitions.length === 0) {
    return <div style={{ marginTop: 12, fontSize: 13, color: MUTED }}>No requisitions to issue against.</div>
  }

  const openIssue = (r: IssuanceReq) => {
    const remaining = Math.max(0, reqd(r) - iss(r))
    setPrompt({ req: r, remaining }); setQty(String(remaining)); setPerr("")
  }
  const confirmIssue = () => {
    if (!prompt) return
    const n = Number(qty)
    if (!n || n <= 0) { setPerr("Enter how much you are issuing."); return }
    if (n > prompt.remaining) { setPerr(`Only ${prompt.remaining} remaining on this requisition.`); return }
    onIssue(prompt.req.id, n); setPrompt(null)
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, marginBottom: 10 }}>
        <span style={{ color: MUTED }}>Requisitioned: <b style={{ color: TEXT }}>{total}</b></span>
        <span style={{ color: MUTED }}>Issued: <b style={{ color: GREEN }}>{issuedTotal}</b></span>
        <span style={{ color: MUTED }}>Owing: <b style={{ color: owing ? AMBER : GREEN }}>{owing}</b></span>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {requisitions.map((r) => {
          const remaining = Math.max(0, reqd(r) - iss(r))
          const done = remaining === 0
          return (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--admin-card-2)", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{r.product} · requested {reqd(r)}</div>
                <div style={{ fontSize: 11.5, color: MUTED }}>
                  {r.requisitionId} · {r.department || "—"} · by {r.requestedBy} · issued <b style={{ color: GREEN }}>{iss(r)}</b>
                  {remaining > 0 ? <> · owing <b style={{ color: AMBER }}>{remaining}</b></> : null}
                </div>
              </div>
              {done ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: GREEN, fontSize: 12.5, fontWeight: 700 }}><Check size={15} /> Fully issued</span>
              ) : (
                <Button onClick={() => openIssue(r)} disabled={saving} style={{ background: GREEN, color: "white", gap: 6, height: 34, fontSize: 13 }}>
                  <Check size={14} /> Issue
                </Button>
              )}
            </div>
          )
        })}
      </div>
      {allIssued ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: GREEN, fontSize: 13, marginBottom: 10, fontWeight: 600 }}>
            <Lock size={15} /> All requisitioned units fully issued. Ready to proceed.
          </div>
          <Button onClick={onProceed} disabled={saving} style={{ background: GREEN, color: "white", gap: 6 }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Proceed to Production
          </Button>
        </div>
      ) : (
        <div style={{ marginTop: 12, fontSize: 12.5, color: MUTED }}>Fully issue every requisition to unlock production.</div>
      )}

      {/* Custom "how much did you issue?" prompt */}
      {prompt && (
        <div onClick={() => setPrompt(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--admin-card)", borderRadius: 12, padding: 20, width: "100%", maxWidth: 360, border: "1px solid var(--admin-border)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 4 }}>Issue against {prompt.req.requisitionId}</div>
            <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 12 }}>{prompt.req.product} — requested {reqd(prompt.req)}, remaining <b style={{ color: AMBER }}>{prompt.remaining}</b></div>
            <label style={labelStyle}>How much are you issuing now?</label>
            <Input autoFocus type="number" min={1} max={prompt.remaining} style={field} value={qty} onChange={(e) => setQty(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") confirmIssue() }} />
            {perr && <div style={{ color: RED, fontSize: 12.5, marginTop: 6 }}>{perr}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => setPrompt(null)} disabled={saving} style={{ height: 38 }}>Cancel</Button>
              <Button onClick={confirmIssue} disabled={saving} style={{ background: GREEN, color: "white", height: 38, gap: 6 }}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Confirm issue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Production cost capture — a dynamic list of named overhead costs (electricity,
// labour, …) that sum to the production total. Material + Issued By are auto-filled
// (read-only). Photo evidence + per-step % live in the ProductionProgress panel.
function ProductionForm({ saving, userName, percent, defaultMaterial, onSubmit }: {
  saving: boolean
  userName: string
  percent: number
  defaultMaterial: string
  onSubmit: (data: Record<string, unknown>) => void
}) {
  const ready = percent >= 100
  const [costs, setCosts] = useState<{ name: string; amount: string }[]>([{ name: "", amount: "" }])
  const [date, setDate] = useState("")
  const [remarks, setRemarks] = useState("")
  const total = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const setCost = (i: number, patch: Partial<{ name: string; amount: string }>) =>
    setCosts((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)))

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div><label style={labelStyle}>Material · auto</label><Input style={{ ...field, background: "var(--admin-card-2)", fontWeight: 600 }} value={defaultMaterial} readOnly /></div>
        <div><label style={labelStyle}>Produced By · auto</label><Input style={{ ...field, background: "var(--admin-card-2)", fontWeight: 600 }} value={userName || "—"} readOnly /></div>
      </div>

      <label style={labelStyle}>Other related costs (e.g. Electricity bill, Labour)</label>
      <div style={{ display: "grid", gap: 8 }}>
        {costs.map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Input style={{ ...field, flex: 2 }} placeholder="Cost name (e.g. Electricity bill)" value={c.name} onChange={(e) => setCost(i, { name: e.target.value })} />
            <Input style={{ ...field, flex: 1 }} type="number" placeholder="Amount" value={c.amount} onChange={(e) => setCost(i, { amount: e.target.value })} />
            <button type="button" onClick={() => setCosts((cs) => cs.length > 1 ? cs.filter((_, j) => j !== i) : cs)} style={{ background: "none", border: "none", cursor: "pointer", color: RED, padding: 4 }} aria-label="Remove cost"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setCosts((cs) => [...cs, { name: "", amount: "" }])} style={{ marginTop: 8, background: "none", border: `1px dashed var(--admin-border)`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: TEXT, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Plus size={14} /> Add cost
      </button>

      <div style={{ marginTop: 12, fontSize: 14, fontWeight: 700, color: TEXT }}>Total production cost: <span style={{ color: GREEN }}>{ksh(total)}</span></div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div><label style={labelStyle}>Production Date</label><Input style={field} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>Remarks</label>
        <textarea style={{ ...field, height: 64, padding: 10 }} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>

      {!ready && (
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#8a6d00", background: "#FFFBEB", border: "1px solid #FBD38D", borderRadius: 8, padding: "10px 12px" }}>
          <Lock size={15} /> Production is at <b>&nbsp;{percent}%</b>&nbsp;— log steps to 100% above before you can finalise &amp; advance.
        </div>
      )}
      <Button
        onClick={() => onSubmit({ costs: costs.map((c) => ({ name: c.name.trim(), amount: Number(c.amount) || 0 })).filter((c) => c.name || c.amount), material: defaultMaterial, issuedBy: userName, date, remarks })}
        disabled={saving || !ready}
        title={ready ? "" : `Production is only ${percent}% complete`}
        style={{ background: ready ? GREEN : "var(--admin-border)", color: ready ? "white" : MUTED, marginTop: 14, gap: 6, cursor: ready ? "pointer" : "not-allowed" }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : ready ? <Check size={16} /> : <Lock size={16} />} Finalise &amp; Advance
      </Button>
    </div>
  )
}

function ApprovalForm({ saving, userName, onSubmit }: { saving: boolean; userName: string; onSubmit: (s: Stage, a: string, d: Record<string, unknown>) => void }) {
  const [reason, setReason] = useState("")
  // Auto-pick the logged-in person; the server also falls back to the token name.
  const approvedBy = userName || "—"
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
        <div><label style={labelStyle}>Approved / Decided By</label><Input style={{ ...field, background: "var(--admin-card-2)", fontWeight: 600 }} value={approvedBy} readOnly /></div>
        <div><label style={labelStyle}>Reason (required to reject)</label><Input style={field} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Button onClick={() => onSubmit("approval", "accept", { approvedBy })} disabled={saving} style={{ background: GREEN, color: "white", gap: 6 }}><Check size={16} /> Accept</Button>
        <Button onClick={() => onSubmit("approval", "reject", { approvedBy, reason })} disabled={saving} style={{ background: RED, color: "white", gap: 6 }}><X size={16} /> Reject</Button>
      </div>
    </div>
  )
}

function RequisitionForm({ saving, onAdd, onProceed, hasRows, acceptedTotal, acceptedRemaining, defaultProduct, defaultDepartment, userName, products }: {
  saving: boolean; onAdd: (data: Record<string, unknown>) => void; onProceed: () => void
  hasRows: boolean; acceptedTotal: number; acceptedRemaining: number; defaultProduct: string
  defaultDepartment: string; userName: string; products: { id: string; name: string }[]
}) {
  const [r, setR] = useState({ department: defaultDepartment, product: defaultProduct, quantityRequired: acceptedRemaining ? String(acceptedRemaining) : "", requestedBy: userName, purpose: "" })
  const [err, setErr] = useState("")

  const add = () => {
    const qty = Number(r.quantityRequired) || 0
    if (!r.product.trim()) { setErr("Product is required."); return }
    if (qty <= 0) { setErr("Enter a quantity."); return }
    if (acceptedTotal > 0 && qty > acceptedRemaining) { setErr(`Only ${acceptedRemaining} accepted units remain — you can't requisition more than what was accepted.`); return }
    setErr("")
    onAdd(r)
    setR({ department: defaultDepartment, product: defaultProduct, quantityRequired: "", requestedBy: userName, purpose: "" })
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>
        {acceptedTotal > 0
          ? <>Accepted by QC: <b style={{ color: TEXT }}>{acceptedTotal}</b> · Remaining: <b style={{ color: acceptedRemaining ? GREEN : RED }}>{acceptedRemaining}</b>. Multiple officers can each add rows, then Proceed.</>
          : <>Multiple requisition officers can each add rows. Click Proceed when done.</>}
      </div>
      {err && <div style={{ background: "#FDEDED", color: RED, padding: "7px 10px", borderRadius: 8, fontSize: 12, marginBottom: 8 }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <div><label style={labelStyle}>Department</label><Input style={field} value={r.department} onChange={(e) => setR({ ...r, department: e.target.value })} /></div>
        <div>
          <label style={labelStyle}>Product</label>
          <Input style={field} value={r.product} onChange={(e) => setR({ ...r, product: e.target.value })} list="req-products" placeholder="Type or search…" />
          <datalist id="req-products">{products.map((p) => <option key={p.id} value={p.name} />)}</datalist>
        </div>
        <div><label style={labelStyle}>Qty Required{acceptedTotal > 0 ? ` (max ${acceptedRemaining})` : ""}</label>
          <Input style={field} type="number" max={acceptedTotal > 0 ? acceptedRemaining : undefined} value={r.quantityRequired} onChange={(e) => setR({ ...r, quantityRequired: e.target.value })} /></div>
        <div><label style={labelStyle}>Requested By · auto</label><Input style={{ ...field, background: "var(--admin-card-2)", fontWeight: 600 }} value={r.requestedBy} readOnly /></div>
        <div><label style={labelStyle}>Purpose</label><Input style={field} value={r.purpose} onChange={(e) => setR({ ...r, purpose: e.target.value })} /></div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <Button onClick={add} disabled={saving} style={{ background: "#8C6A4A", color: "white", gap: 6 }}>Add Requisition</Button>
        <Button onClick={onProceed} disabled={saving || !hasRows} style={{ background: GREEN, color: "white", gap: 6 }}>Proceed to Issuance</Button>
      </div>
    </div>
  )
}

function ReceivingDisplay({ record }: { record: Record<string, unknown> }) {
  const bd = parseBreakdown(record.condition as string)
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "6px 16px", marginBottom: bd ? 10 : 0 }}>
        {Object.entries(record)
          .filter(([k, v]) => !HIDDEN_KEYS.has(k) && v !== null && v !== "" && k !== "status" && k !== "condition" && k !== "variance")
          .map(([k, v]) => (
            <div key={k} style={{ fontSize: 13 }}>
              <span style={{ color: MUTED }}>{prettyKey(k)}: </span>
              <span style={{ color: TEXT, fontWeight: 500 }}>{String(v)}</span>
            </div>
          ))}
      </div>
      {bd ? (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 6 }}>
          <thead>
            <tr style={{ color: MUTED, textAlign: "left", borderBottom: "1px solid var(--admin-border)" }}>
              <th style={{ padding: "4px 8px" }}>Qty</th>
              <th style={{ padding: "4px 8px" }}>Condition</th>
              <th style={{ padding: "4px 8px" }}>Grade</th>
            </tr>
          </thead>
          <tbody>
            {bd.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--admin-border)" }}>
                <td style={{ padding: "5px 8px", fontWeight: 600, color: TEXT }}>{r.qty}</td>
                <td style={{ padding: "5px 8px", color: TEXT }}>{r.condition}</td>
                <td style={{ padding: "5px 8px", color: TEXT }}>{r.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        record.condition ? <div style={{ fontSize: 13 }}><span style={{ color: MUTED }}>Condition: </span><span style={{ color: TEXT }}>{record.condition as string}</span></div> : null
      )}
      <ImageThumbs urls={(record.images as string[]) ?? []} />
    </div>
  )
}

interface BdRow { qty: string; condition: string; grade: string }

function ReceivingForm({ saving, onSubmit, dispatchedQty, productName, userName }: {
  saving: boolean
  onSubmit: (data: Record<string, unknown>) => void
  dispatchedQty: number
  productName: string
  userName: string
}) {
  const [rows, setRows] = useState<BdRow[]>([{ qty: String(dispatchedQty || ""), condition: "", grade: "" }])
  const [receiver, setReceiver] = useState(userName)
  const [images, setImages] = useState<string[]>([])
  const [remarks, setRemarks] = useState("")
  const [err, setErr] = useState("")

  const totalAccounted = rows.reduce((s, r) => s + (Number(r.qty) || 0), 0)
  const remaining = dispatchedQty > 0 ? dispatchedQty - totalAccounted : 0

  const updateRow = (i: number, patch: Partial<BdRow>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i))
  const addBreakdown = () => {
    if (remaining > 0) setRows((prev) => [...prev, { qty: String(remaining), condition: "", grade: "" }])
  }

  const handleSubmit = () => {
    if (rows.some((r) => !r.condition.trim())) { setErr("Enter a condition for every row."); return }
    if (dispatchedQty > 0 && remaining !== 0) { setErr(`All ${dispatchedQty} dispatched units must be accounted for (${remaining > 0 ? remaining + " unaccounted" : Math.abs(remaining) + " over-counted"}).`); return }
    setErr("")
    const breakdown = rows.map((r) => ({ qty: Number(r.qty) || 0, condition: r.condition.trim(), grade: r.grade.trim() }))
    onSubmit({
      product: productName,
      quantityReceived: totalAccounted,
      condition: JSON.stringify(breakdown),
      receiver,
      images,
      remarks,
    })
  }

  return (
    <div style={{ marginTop: 12 }}>
      {dispatchedQty > 0 && (
        <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 10 }}>
          Dispatched: <b style={{ color: TEXT }}>{dispatchedQty}</b> ·
          Accounted: <b style={{ color: totalAccounted === dispatchedQty ? GREEN : TEXT }}>{totalAccounted}</b>
          {remaining > 0 && <> · <b style={{ color: AMBER }}>Unaccounted: {remaining}</b></>}
          {remaining < 0 && <> · <b style={{ color: RED }}>Over by {Math.abs(remaining)}</b></>}
        </div>
      )}

      {err && <div style={{ background: "#FDEDED", color: RED, padding: "7px 10px", borderRadius: 8, fontSize: 12, marginBottom: 10 }}>{err}</div>}

      {/* Breakdown rows */}
      <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr auto", gap: 8, alignItems: "end" }}>
            <div>
              {i === 0 && <label style={labelStyle}>Qty</label>}
              <Input style={field} type="number" min="0" value={r.qty} onChange={(e) => updateRow(i, { qty: e.target.value })} />
            </div>
            <div>
              {i === 0 && <label style={labelStyle}>Condition</label>}
              <Input style={field} value={r.condition} onChange={(e) => updateRow(i, { condition: e.target.value })} placeholder="e.g. good, damaged" />
            </div>
            <div>
              {i === 0 && <label style={labelStyle}>Grade</label>}
              <Input style={field} value={r.grade} onChange={(e) => updateRow(i, { grade: e.target.value })} placeholder="e.g. A, B, C" />
            </div>
            <div style={{ paddingBottom: 2 }}>
              {rows.length > 1 && (
                <button type="button" onClick={() => removeRow(i)} style={{ background: "none", border: "none", cursor: "pointer", color: RED, padding: 4 }}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <button type="button" onClick={addBreakdown} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${AMBER}`, color: AMBER, borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
          <Plus size={14} /> Add breakdown for remaining {remaining}
        </button>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Received By</label>
          <Input style={field} value={receiver} onChange={(e) => setReceiver(e.target.value)} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Images</label>
          <ImageUploader value={images} onChange={setImages} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Remarks</label>
          <textarea style={{ ...field, height: 64, padding: 10 }} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={saving} style={{ background: GREEN, color: "white", gap: 6 }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Submit & Advance
      </Button>
    </div>
  )
}
