"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import {
  Banknote, ClipboardList, CheckCircle2, Hourglass, Ban, Timer,
  Paperclip, Search, Eye, CalendarDays,
} from "lucide-react"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const RED = "#C0392B"
const AMBER = "#B8860B"
const TEAL = "#0F766E"
const BROWN = "#8C6A4A"
const ksh = (n: number) => `KSh ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`

interface FinLpo {
  id: string
  number: string
  supplierName: string
  orderDate: string
  createdAt: string
  total: number
  status?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
  rejectionReason?: string | null
  destinationOfGoods?: string | null
  amended?: boolean
  onBehalf?: boolean
  origin?: string | null
  createdByName?: string | null
  chiefApprovedBy?: string | null
  chiefApprovedAt?: string | null
  attachmentUrl?: string | null
}

// Display buckets for the approval pipeline. "In approval" = anything between
// submission and the CEO's final decision.
const PENDING_STATUSES = ["pending", "pending_chief", "exec_approved", "chief_approved"]
const STATUS_META: { key: string; label: string; color: string; match: (s: string) => boolean }[] = [
  { key: "approved", label: "Approved", color: GREEN, match: (s) => s === "approved" },
  { key: "awaiting_first", label: "Awaiting 1st approval", color: AMBER, match: (s) => s === "pending" || s === "pending_chief" },
  { key: "awaiting_ceo", label: "Awaiting CEO", color: TEAL, match: (s) => s === "exec_approved" || s === "chief_approved" },
  { key: "rejected", label: "Rejected", color: RED, match: (s) => s === "rejected" },
]

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-KE") : "—")
const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : "—"

// Human turnaround between two timestamps, e.g. "3d 4h", "5h 12m", "18m".
function turnaround(from?: string | null, to?: string | null): string | null {
  if (!from || !to) return null
  const ms = new Date(to).getTime() - new Date(from).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  const mins = Math.floor(ms / 60000)
  const days = Math.floor(mins / 1440)
  const hours = Math.floor((mins % 1440) / 60)
  const rem = mins % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${rem}m`
  return `${rem}m`
}

export default function FinanceDashboard() {
  const [lpos, setLpos] = useState<FinLpo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [originFilter, setOriginFilter] = useState("all")

  useEffect(() => {
    fetch("/api/finance/lpos")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(setLpos)
      .catch(() => setError("Could not load the finance data (finance/admin only)."))
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const status = (l: FinLpo) => l.status || "approved" // pre-migration rows count as approved
    const approved = lpos.filter((l) => status(l) === "approved")
    const pending = lpos.filter((l) => PENDING_STATUSES.includes(status(l)))
    const rejected = lpos.filter((l) => status(l) === "rejected")
    const sum = (xs: FinLpo[]) => xs.reduce((s, l) => s + (Number(l.total) || 0), 0)

    // Average submission → final CEO approval turnaround, across approved LPOs.
    const turnarounds = approved
      .map((l) => (l.approvedAt && l.createdAt ? new Date(l.approvedAt).getTime() - new Date(l.createdAt).getTime() : null))
      .filter((t): t is number => t !== null && t >= 0)
    const avgMs = turnarounds.length ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length : null
    const avgLabel = avgMs === null ? "—"
      : avgMs >= 86400000 ? `${(avgMs / 86400000).toFixed(1)} days`
      : avgMs >= 3600000 ? `${(avgMs / 3600000).toFixed(1)} hrs`
      : `${Math.round(avgMs / 60000)} min`

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const thisMonth = lpos.filter((l) => new Date(l.createdAt).getTime() >= monthStart)

    return {
      total: lpos.length, totalValue: sum(lpos),
      approved: approved.length, approvedValue: sum(approved),
      pending: pending.length, pendingValue: sum(pending),
      rejected: rejected.length, rejectedValue: sum(rejected),
      avgLabel,
      monthCount: thisMonth.length, monthValue: sum(thisMonth),
      buckets: STATUS_META.map((m) => {
        const xs = lpos.filter((l) => m.match(status(l)))
        return { ...m, count: xs.length, value: sum(xs) }
      }),
      internal: lpos.filter((l) => l.origin !== "external").length,
      internalValue: sum(lpos.filter((l) => l.origin !== "external")),
      external: lpos.filter((l) => l.origin === "external").length,
      externalValue: sum(lpos.filter((l) => l.origin === "external")),
    }
  }, [lpos])

  const q = search.trim().toLowerCase()
  const displayed = lpos.filter((l) => {
    const s = l.status || "approved"
    if (statusFilter === "approved" && s !== "approved") return false
    if (statusFilter === "pending" && !PENDING_STATUSES.includes(s)) return false
    if (statusFilter === "rejected" && s !== "rejected") return false
    if (originFilter !== "all" && (l.origin ?? "internal") !== originFilter) return false
    if (q && !l.number.toLowerCase().includes(q) && !l.supplierName.toLowerCase().includes(q)
      && !(l.createdByName ?? "").toLowerCase().includes(q) && !(l.approvedBy ?? "").toLowerCase().includes(q)) return false
    return true
  })

  const statusPill = (l: FinLpo) => {
    const s = l.status || "approved"
    const meta = STATUS_META.find((m) => m.match(s)) ?? STATUS_META[0]
    const label = s === "pending" ? "Awaiting Factory Admin"
      : s === "pending_chief" ? "Awaiting Chief"
      : s === "exec_approved" ? "Awaiting CEO (F.A. ok)"
      : s === "chief_approved" ? "Awaiting CEO (Chief ok)"
      : meta.label
    return (
      <span style={{ display: "inline-flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ background: meta.color, color: "white", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>{label}</span>
        {s === "approved" && l.onBehalf && <span style={{ background: "#ede9fe", color: "#6d28d9", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999 }}>On behalf</span>}
        {l.amended && <span style={{ background: "#ccfbf1", color: TEAL, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999 }}>Amended</span>}
      </span>
    )
  }

  const tiles = [
    { label: "All LPOs", value: String(stats.total), sub: ksh(stats.totalValue), icon: ClipboardList, color: "#2C5282" },
    { label: "Approved", value: String(stats.approved), sub: ksh(stats.approvedValue), icon: CheckCircle2, color: GREEN },
    { label: "In approval", value: String(stats.pending), sub: ksh(stats.pendingValue), icon: Hourglass, color: AMBER },
    { label: "Rejected", value: String(stats.rejected), sub: ksh(stats.rejectedValue), icon: Ban, color: RED },
    { label: "Avg. approval time", value: stats.avgLabel, sub: "submission → CEO sign-off", icon: Timer, color: TEAL },
    { label: "This month", value: String(stats.monthCount), sub: ksh(stats.monthValue), icon: CalendarDays, color: BROWN },
  ]

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Banknote size={22} color={GREEN} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Finance — Purchase Orders</h1>
          <p style={{ fontSize: 12, color: MUTED }}>Every LPO with its full approval trail: who approved, when, and for how much</p>
        </div>
      </div>

      {error && <div style={{ background: "#FBEAEA", color: "#9B2C2C", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <p style={{ padding: 24, color: MUTED }}>Loading…</p>
      ) : (
        <>
          {/* Stat tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))", gap: 14, marginBottom: 22 }}>
            {tiles.map((s, i) => (
              <div key={i} style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: "var(--admin-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <s.icon size={18} color={s.color} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, whiteSpace: "nowrap" }}>{s.value}</div>
                  <div style={{ fontSize: 11.5, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline breakdown + origin split */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 14, marginBottom: 22 }}>
            <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Approval pipeline</div>
              {stats.total > 0 && (
                <div style={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden", gap: 2, marginBottom: 12, background: "var(--admin-bg)" }}>
                  {stats.buckets.filter((b) => b.count > 0).map((b) => (
                    <div key={b.key} title={`${b.label}: ${b.count}`} style={{ width: `${(b.count / stats.total) * 100}%`, background: b.color, minWidth: 6 }} />
                  ))}
                </div>
              )}
              <div style={{ display: "grid", gap: 6 }}>
                {stats.buckets.map((b) => (
                  <div key={b.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: b.color, flexShrink: 0 }} />
                    <span style={{ color: TEXT, flex: 1 }}>{b.label}</span>
                    <span style={{ color: TEXT, fontWeight: 700 }}>{b.count}</span>
                    <span style={{ color: MUTED, minWidth: 110, textAlign: "right" }}>{ksh(b.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 12 }}>By origin</div>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ background: GREEN, color: "white", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.4 }}>Internal</span>
                  <span style={{ color: MUTED, flex: 1 }}>Beeyond Trees</span>
                  <span style={{ color: TEXT, fontWeight: 700 }}>{stats.internal}</span>
                  <span style={{ color: MUTED, minWidth: 110, textAlign: "right" }}>{ksh(stats.internalValue)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ background: BROWN, color: "white", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.4 }}>External</span>
                  <span style={{ color: MUTED, flex: 1 }}>Bamboosa</span>
                  <span style={{ color: TEXT, fontWeight: 700 }}>{stats.external}</span>
                  <span style={{ color: MUTED, minWidth: 110, textAlign: "right" }}>{ksh(stats.externalValue)}</span>
                </div>
              </div>
              <p style={{ fontSize: 11.5, color: MUTED, marginTop: 14 }}>
                Internal LPOs are approved by the Factory Admin, external by the Chief — then the CEO gives the final sign-off. Finance is copied on every final approval.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 340 }}>
              <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: MUTED }} />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search number, supplier, or person…" style={{ paddingLeft: 34, height: 40 }} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              style={{ height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT, background: "var(--admin-card)", fontSize: 13 }}>
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">In approval</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={originFilter} onChange={(e) => setOriginFilter(e.target.value)}
              style={{ height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT, background: "var(--admin-card)", fontSize: 13 }}>
              <option value="all">All origins</option>
              <option value="internal">Internal (Beeyond Trees)</option>
              <option value="external">External (Bamboosa)</option>
            </select>
          </div>

          {/* Detail table */}
          <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, overflow: "hidden" }}>
            {displayed.length === 0 ? (
              <p style={{ padding: 24, color: MUTED, textAlign: "center" }}>No purchase orders match.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1050 }}>
                  <thead>
                    <tr style={{ background: "var(--admin-card-2)", fontSize: 12, color: MUTED, textAlign: "left" }}>
                      <th style={th}>Number</th>
                      <th style={th}>Supplier</th>
                      <th style={th}>Raised by</th>
                      <th style={th}>Date</th>
                      <th style={{ ...th, textAlign: "right" }}>Amount</th>
                      <th style={th}>Status</th>
                      <th style={th}>1st approval</th>
                      <th style={th}>Final (CEO)</th>
                      <th style={th}>Turnaround</th>
                      <th style={{ ...th, textAlign: "right" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map((l) => {
                      const s = l.status || "approved"
                      const finalTurnaround = s === "approved" ? turnaround(l.createdAt, l.approvedAt) : null
                      return (
                        <tr key={l.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                          <td style={{ ...td, fontWeight: 600 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              {l.number}
                              {l.attachmentUrl && (
                                <a href={l.attachmentUrl} target="_blank" rel="noopener noreferrer" title="View attachment" style={{ display: "inline-flex", color: MUTED }}>
                                  <Paperclip size={12} />
                                </a>
                              )}
                            </span>
                            <span style={{ display: "block", fontSize: 10.5, color: MUTED, fontWeight: 400, textTransform: "uppercase", letterSpacing: 0.4 }}>
                              {l.origin === "external" ? "External" : "Internal"}
                            </span>
                          </td>
                          <td style={td}>{l.supplierName}</td>
                          <td style={td}>{l.createdByName || "—"}</td>
                          <td style={td}>{fmtDate(l.orderDate)}</td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 600, whiteSpace: "nowrap" }}>{ksh(Number(l.total) || 0)}</td>
                          <td style={td}>
                            {statusPill(l)}
                            {s === "rejected" && l.rejectionReason && (
                              <div style={{ fontSize: 11, color: RED, marginTop: 3, maxWidth: 200 }}>{l.rejectionReason}</div>
                            )}
                          </td>
                          <td style={td}>
                            {l.chiefApprovedBy ? (
                              <>
                                <div style={{ fontWeight: 600 }}>{l.chiefApprovedBy} <span style={{ fontSize: 10.5, color: MUTED, fontWeight: 400 }}>(Chief)</span></div>
                                <div style={{ fontSize: 11, color: MUTED }}>{fmtDateTime(l.chiefApprovedAt)}</div>
                              </>
                            ) : s !== "pending" && s !== "pending_chief" && l.approvedBy && s !== "approved" ? (
                              <>
                                <div style={{ fontWeight: 600 }}>{l.approvedBy}</div>
                                <div style={{ fontSize: 11, color: MUTED }}>{fmtDateTime(l.approvedAt)}</div>
                              </>
                            ) : (
                              <span style={{ color: MUTED }}>—</span>
                            )}
                          </td>
                          <td style={td}>
                            {s === "approved" || s === "rejected" ? (
                              <>
                                <div style={{ fontWeight: 600 }}>{l.approvedBy || "—"}</div>
                                <div style={{ fontSize: 11, color: MUTED }}>{fmtDateTime(l.approvedAt)}</div>
                              </>
                            ) : (
                              <span style={{ color: MUTED }}>—</span>
                            )}
                          </td>
                          <td style={{ ...td, whiteSpace: "nowrap" }}>
                            {finalTurnaround ? <span style={{ fontWeight: 600, color: TEXT }}>{finalTurnaround}</span> : <span style={{ color: MUTED }}>—</span>}
                          </td>
                          <td style={{ ...td, textAlign: "right" }}>
                            <Link href={`/admin/lpo/${l.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#555", fontWeight: 600, fontSize: 12.5, textDecoration: "none", padding: "5px 10px", border: "1px solid var(--admin-border)", borderRadius: 8, whiteSpace: "nowrap" }}>
                              <Eye size={13} /> View
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p style={{ marginTop: 12, fontSize: 12, color: MUTED }}>
            Turnaround = time from submission to final CEO approval. “1st approval” is the Factory Admin (internal LPOs) or the Chief (external LPOs).
          </p>
        </>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: "10px 14px", fontWeight: 600, whiteSpace: "nowrap" }
const td: React.CSSProperties = { padding: "10px 14px", fontSize: 13, color: TEXT, verticalAlign: "top" }
