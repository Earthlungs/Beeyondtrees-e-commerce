"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, BarChart3 } from "lucide-react"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"

interface BatchRow {
  id: string
  code: string
  status: string
  harvest: { totalWeightKg: number; weightForDryingKg: number } | null
  dehydration: { driedWeightKg: number } | null
}

export default function FungicultureReportsPage() {
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/fungiculture/batches")
      .then((r) => (r.ok ? r.json() : []))
      .then(setBatches)
      .finally(() => setLoading(false))
  }, [])

  const rows = batches.filter((b) => b.status === "completed" && b.harvest && b.dehydration)

  return (
    <div style={{ maxWidth: 900 }}>
      <Link href="/admin/fungiculture" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 13, textDecoration: "none", marginBottom: 14 }}>
        <ArrowLeft size={15} /> Fungiculture
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <BarChart3 size={22} color={GREEN} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Production Reports</h1>
          <p style={{ fontSize: 12, color: MUTED }}>Drying yield across completed batches — how much weight was lost to dehydration</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED }}>No completed batches yet.</div>
      ) : (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--admin-card-2)", textAlign: "left" }}>
                <th style={{ padding: "10px 14px", color: MUTED, fontWeight: 600 }}>Batch</th>
                <th style={{ padding: "10px 14px", color: MUTED, fontWeight: 600 }}>Fresh Weight (kg)</th>
                <th style={{ padding: "10px 14px", color: MUTED, fontWeight: 600 }}>Sent to Drying (kg)</th>
                <th style={{ padding: "10px 14px", color: MUTED, fontWeight: 600 }}>Dried Weight (kg)</th>
                <th style={{ padding: "10px 14px", color: MUTED, fontWeight: 600 }}>Yield Retained</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const forDrying = b.harvest!.weightForDryingKg
                const dried = b.dehydration!.driedWeightKg
                const yieldPct = forDrying > 0 ? (dried / forDrying) * 100 : null
                return (
                  <tr key={b.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: TEXT }}>{b.code}</td>
                    <td style={{ padding: "10px 14px", color: TEXT }}>{b.harvest!.totalWeightKg}</td>
                    <td style={{ padding: "10px 14px", color: TEXT }}>{forDrying}</td>
                    <td style={{ padding: "10px 14px", color: TEXT }}>{dried}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: TEXT }}>{yieldPct !== null ? `${yieldPct.toFixed(1)}%` : "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
