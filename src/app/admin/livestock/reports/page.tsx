"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, BarChart3 } from "lucide-react"
import { YIELD_TYPE_LABELS } from "@/lib/livestock-stages"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"

interface YieldRow {
  id: string; type: string; quantity: number; unit: string; recordedAt: string
  housing: { name: string; code: string } | null
  animal: { code: string; tagId: string | null; species: string } | null
}

export default function LivestockReportsPage() {
  const [yields, setYields] = useState<YieldRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/livestock/yields")
      .then((r) => (r.ok ? r.json() : []))
      .then(setYields)
      .finally(() => setLoading(false))
  }, [])

  const totals = new Map<string, { qty: number; unit: string }>()
  for (const y of yields) {
    const key = `${y.type}|${y.unit}`
    const cur = totals.get(key)
    totals.set(key, { qty: (cur?.qty ?? 0) + y.quantity, unit: y.unit })
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <Link href="/admin/livestock" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 13, textDecoration: "none", marginBottom: 14 }}>
        <ArrowLeft size={15} /> Livestock
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <BarChart3 size={22} color={GREEN} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Production Reports</h1>
          <p style={{ fontSize: 12, color: MUTED }}>Total yield by product type, and the full production log</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
      ) : yields.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED }}>No yield recorded yet.</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[...totals.entries()].map(([key, v]) => {
              const [type] = key.split("|")
              return (
                <div key={key} style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, textTransform: "uppercase" }}>{YIELD_TYPE_LABELS[type] ?? type}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: TEXT }}>{v.qty.toLocaleString()} {v.unit}</div>
                </div>
              )
            })}
          </div>

          <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--admin-card-2)", textAlign: "left" }}>
                  <th style={{ padding: "10px 14px", color: MUTED, fontWeight: 600 }}>Date</th>
                  <th style={{ padding: "10px 14px", color: MUTED, fontWeight: 600 }}>Type</th>
                  <th style={{ padding: "10px 14px", color: MUTED, fontWeight: 600 }}>Quantity</th>
                  <th style={{ padding: "10px 14px", color: MUTED, fontWeight: 600 }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {yields.map((y) => (
                  <tr key={y.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                    <td style={{ padding: "10px 14px", color: TEXT }}>{new Date(y.recordedAt).toLocaleDateString("en-KE", { day: "2-digit", month: "2-digit", year: "numeric" })}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: TEXT }}>{YIELD_TYPE_LABELS[y.type] ?? y.type}</td>
                    <td style={{ padding: "10px 14px", color: TEXT }}>{y.quantity} {y.unit}</td>
                    <td style={{ padding: "10px 14px", color: MUTED }}>{y.animal ? `${y.animal.code}${y.animal.tagId ? ` (Tag ${y.animal.tagId})` : ""}` : y.housing ? y.housing.name : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
