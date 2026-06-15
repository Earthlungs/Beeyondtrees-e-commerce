"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { BarChart3, Loader2 } from "lucide-react"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const RED = "#C0392B"
const ksh = (n: number) => `KSh ${(n ?? 0).toLocaleString()}`

interface Tier { tier: string; sellingPrice: number; margin: number; marginPct: number; verdict: string }
interface Reports {
  perBatch: { id: string; code: string; productName: string | null; status: string; stage: string; totalCost: number; units: number; costPerUnit: number; matchedProductName: string | null; tiers: Tier[]; verdict: string }[]
  aggregate: { totalCost: number; lossRisk: number; completed: number; inProgress: number; rejected: number; batches: number; byDay: { date: string; cost: number; count: number; lossRisk: number }[] }
  costByStage: { harvestLabor: number; harvestTransport: number; harvestOther: number; production: number; dispatchTransport: number; total: number; overBudgetBatches: number }
  cycle: { stageDurations: { stage: string; label: string; avgHours: number | null }[]; avgTotalCycleHours: number | null; approvalRejectionRate: number; avgInspectionRejectPct: number }
}

const card: React.CSSProperties = { background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 18 }
const th: React.CSSProperties = { padding: "8px", color: MUTED, fontWeight: 600, textAlign: "left" }
const td: React.CSSProperties = { padding: "8px", color: TEXT }

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ background: "var(--admin-card-2)", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: MUTED }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: tone || TEXT }}>{value}</div>
    </div>
  )
}

export default function ValueChainReports() {
  const [r, setR] = useState<Reports | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch("/api/tracing/reports").then((res) => (res.ok ? res.json() : null)).then(setR).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
  if (!r) return <div style={{ padding: 40, color: MUTED }}>Could not load reports (admin / IT only).</div>

  const cs = r.costByStage
  const maxDay = Math.max(1, ...r.aggregate.byDay.map((d) => d.cost))

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <BarChart3 size={22} color={GREEN} />
        <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Value Chain Reports</h1>
      </div>

      {/* Aggregate */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Stat label="Total Production Cost" value={ksh(r.aggregate.totalCost)} />
        <Stat label="Batches" value={String(r.aggregate.batches)} />
        <Stat label="Completed" value={String(r.aggregate.completed)} tone={GREEN} />
        <Stat label="In Progress" value={String(r.aggregate.inProgress)} tone="#B8860B" />
        <Stat label="Loss-risk" value={String(r.aggregate.lossRisk)} tone={r.aggregate.lossRisk ? RED : GREEN} />
        <Stat label="Rejected" value={String(r.aggregate.rejected)} tone={RED} />
      </div>

      {/* Aggregate over time */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Production Cost Over Time</h2>
        {r.aggregate.byDay.length === 0 ? <div style={{ color: MUTED, fontSize: 13 }}>No data yet.</div> : (
          <div style={{ display: "grid", gap: 6 }}>
            {r.aggregate.byDay.map((d) => (
              <div key={d.date} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 86, fontSize: 12, color: MUTED }}>{d.date}</div>
                <div style={{ flex: 1, background: "var(--admin-border)", borderRadius: 6, height: 18, overflow: "hidden" }}>
                  <div style={{ width: `${(d.cost / maxDay) * 100}%`, background: d.lossRisk ? RED : GREEN, height: "100%" }} />
                </div>
                <div style={{ width: 110, fontSize: 12, color: TEXT, textAlign: "right" }}>{ksh(d.cost)} · {d.count}b</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cost by stage */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Cost Breakdown by Stage</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
          <Stat label="Harvest · Labor" value={ksh(cs.harvestLabor)} />
          <Stat label="Harvest · Transport" value={ksh(cs.harvestTransport)} />
          <Stat label="Harvest · Other" value={ksh(cs.harvestOther)} />
          <Stat label="Production" value={ksh(cs.production)} />
          <Stat label="Dispatch · Transport" value={ksh(cs.dispatchTransport)} />
          <Stat label="Over-budget batches" value={String(cs.overBudgetBatches)} tone={cs.overBudgetBatches ? RED : GREEN} />
        </div>
      </div>

      {/* Cycle time */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Cycle Time & Bottlenecks</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 14 }}>
          <Stat label="Avg total cycle" value={r.cycle.avgTotalCycleHours != null ? `${r.cycle.avgTotalCycleHours} h` : "—"} />
          <Stat label="Approval rejection rate" value={`${r.cycle.approvalRejectionRate}%`} tone={r.cycle.approvalRejectionRate ? RED : GREEN} />
          <Stat label="Avg inspection reject" value={`${r.cycle.avgInspectionRejectPct}%`} />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr><th style={th}>Stage</th><th style={th}>Avg time to complete</th></tr></thead>
          <tbody>
            {r.cycle.stageDurations.map((s) => (
              <tr key={s.stage} style={{ borderTop: "1px solid var(--admin-border)" }}>
                <td style={td}>{s.label}</td>
                <td style={td}>{s.avgHours != null ? `${s.avgHours} h` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-batch P/L */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Profit / Loss per Batch</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Batch</th><th style={th}>Product</th><th style={th}>Cost/Unit</th>
                <th style={th}>Matched</th><th style={th}>Retail margin</th><th style={th}>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {r.perBatch.map((b) => {
                const retail = b.tiers.find((t) => t.tier === "retail")
                return (
                  <tr key={b.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                    <td style={td}><Link href={`/admin/tracing/${b.id}`} style={{ color: GREEN, fontWeight: 600 }}>{b.code}</Link></td>
                    <td style={td}>{b.productName || "—"}</td>
                    <td style={td}>{ksh(b.costPerUnit)}</td>
                    <td style={td}>{b.matchedProductName || <span style={{ color: MUTED }}>—</span>}</td>
                    <td style={{ ...td, color: retail ? (retail.margin < 0 ? RED : GREEN) : MUTED, fontWeight: 600 }}>{retail ? ksh(retail.margin) : "—"}</td>
                    <td style={td}>
                      <span style={{ background: b.verdict === "loss" ? RED : b.verdict === "profit" ? GREEN : MUTED, color: "white", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999, textTransform: "capitalize" }}>{b.verdict}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
