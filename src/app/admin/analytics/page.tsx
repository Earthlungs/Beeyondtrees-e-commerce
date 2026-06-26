"use client"

import { useState, useEffect, useCallback } from "react"
import {
  TrendingUp, TrendingDown, Wallet, Boxes, Globe, Store,
  MapPin, Package, Clock, Loader2, Banknote, Smartphone, CreditCard, Receipt, Award, Tag,
} from "lucide-react"

const TEXT = "var(--admin-text)", MUTED = "#A89F91", GREEN = "#6B7D5C", BROWN = "#8C6A4A", DARK = "#3D3226", CREAM = "var(--admin-card-2)"
const ksh = (n: number) => `KSh ${Math.round(n).toLocaleString()}`
const EAT = 3 * 60 * 60 * 1000
const eatToday = () => new Date(Date.now() + EAT).toISOString().slice(0, 10)
const eatDaysAgo = (d: number) => new Date(Date.now() + EAT - d * 86400000).toISOString().slice(0, 10)

interface Analytics {
  totalSales: number; onlineSales: number; posSales: number; orderCount: number
  netProfit: number; cogs: number; costKnown: boolean; margin: number
  stockRetailValue: number; stockCostValue: number
  topLocations: { location: string; orders: number; revenue: number }[]
  topProducts: { name: string; qty: number; revenue: number }[]
  topSellers: { name: string; orders: number; revenue: number }[]
  byMethod: Record<string, { amount: number; count: number }>
  collectors: { name: string; total: number; cash: number; mpesa: number; card: number; orders: number }[]
  totalDiscount: number
  discounts: { seller: string; product: string; qty: number; marked: number; sold: number; discount: number; pct: number }[]
  hourly: { hour: number; online: number; pos: number }[]
  bonusYear: number; bonusRate: number; bonusTotal: number
  bonuses: { name: string; role: string | null; department: string; orders: number; revenue: number; bonus: number }[]
}

type Preset = "today" | "7d" | "30d" | "custom"

export default function AnalyticsPage() {
  const [preset, setPreset] = useState<Preset>("today")
  const [from, setFrom] = useState(eatToday())
  const [to, setTo] = useState(eatToday())
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  const applyPreset = (p: Preset) => {
    setPreset(p)
    if (p === "today") { setFrom(eatToday()); setTo(eatToday()) }
    else if (p === "7d") { setFrom(eatDaysAgo(6)); setTo(eatToday()) }
    else if (p === "30d") { setFrom(eatDaysAgo(29)); setTo(eatToday()) }
  }

  const load = useCallback(async () => {
    setLoading(true); setErr("")
    try {
      const res = await fetch(`/api/analytics?from=${from}&to=${to}`)
      if (!res.ok) { setErr(res.status === 403 ? "Admins only." : "Could not load analytics."); setData(null); return }
      setData(await res.json())
    } catch { setErr("Network error.") }
    finally { setLoading(false) }
  }, [from, to])
  // Legitimate fetch-on-change effect; the synchronous setLoading is intended.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const rangeLabel = preset === "today" ? "Today" : preset === "7d" ? "Last 7 days" : preset === "30d" ? "Last 30 days" : `${from} → ${to}`
  const profitPositive = (data?.netProfit ?? 0) >= 0
  const maxHour = Math.max(1, ...(data?.hourly.map((h) => h.online + h.pos) ?? [1]))

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <TrendingUp size={22} color={GREEN} />
        <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Analytics</h1>
      </div>
      <p style={{ color: MUTED, fontSize: 13, marginBottom: 18 }}>Showing <strong>{rangeLabel}</strong>. Daily figures reset at midnight (EAT); use the date filter for any period.</p>

      {/* Range controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 20 }}>
        {(["today", "7d", "30d"] as Preset[]).map((p) => (
          <button key={p} onClick={() => applyPreset(p)} style={{
            padding: "8px 14px", borderRadius: 999, border: preset === p ? `2px solid ${GREEN}` : "1px solid var(--admin-border)",
            background: preset === p ? "#EAF3EA" : "white", color: preset === p ? GREEN : TEXT, cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}>{p === "today" ? "Today" : p === "7d" ? "7 days" : "30 days"}</button>
        ))}
        <span style={{ marginLeft: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: MUTED }}>
          <input type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPreset("custom") }} style={dateInput} />
          <span>to</span>
          <input type="date" value={to} max={eatToday()} onChange={(e) => { setTo(e.target.value); setPreset("custom") }} style={dateInput} />
        </span>
      </div>

      {err && <div style={{ background: "#FBEAEA", color: "#9B2C2C", padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 14 }}>{err}</div>}
      {loading && <div style={{ display: "flex", alignItems: "center", gap: 8, color: MUTED, padding: 20 }}><Loader2 size={16} className="animate-spin" /> Loading…</div>}

      {data && !loading && (
        <>
          {/* Profit / loss banner */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 14, marginBottom: 18,
            background: profitPositive ? "#EAF3EA" : "#FBEAEA", border: `1px solid ${profitPositive ? "#CADBC2" : "#F0C9C9"}`,
          }}>
            {profitPositive ? <TrendingUp size={26} color={GREEN} /> : <TrendingDown size={26} color="#9B2C2C" />}
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: profitPositive ? "#2F5D2F" : "#9B2C2C" }}>
                {profitPositive ? "In profit" : "Running at a loss"} — net {ksh(data.netProfit)} ({data.margin.toFixed(1)}% margin)
              </div>
              <div style={{ fontSize: 12.5, color: MUTED }}>
                Sales {ksh(data.totalSales)} − cost of goods {ksh(data.cogs)} for {rangeLabel.toLowerCase()}.
                {!data.costKnown && " ⚠ Set product cost prices for accurate profit (currently treated as 0)."}
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 22 }}>
            <Kpi icon={<Wallet size={18} />} label="Total Sales" value={ksh(data.totalSales)} sub={`${data.orderCount} orders`} accent={GREEN} />
            <Kpi icon={profitPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />} label="Net Profit" value={ksh(data.netProfit)} sub={`${data.margin.toFixed(1)}% margin`} accent={profitPositive ? GREEN : "#9B2C2C"} />
            <Kpi icon={<Globe size={18} />} label="Website Sales" value={ksh(data.onlineSales)} sub={`${pct(data.onlineSales, data.totalSales)} of sales`} accent="#3E6E8E" />
            <Kpi icon={<Store size={18} />} label="POS Sales" value={ksh(data.posSales)} sub="View seller breakdown →" accent={BROWN}
              onClick={() => document.getElementById("seller-breakdown")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
            <Kpi icon={<Boxes size={18} />} label="Stock Value (retail)" value={ksh(data.stockRetailValue)} sub={`cost ${ksh(data.stockCostValue)}`} accent={DARK} />
          </div>

          {/* Money collected by method */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 22 }}>
            <MethodCard icon={<Banknote size={18} />} label="Cash collected" m={data.byMethod.cash} accent="#2E7D32" />
            <MethodCard icon={<Smartphone size={18} />} label="M-Pesa collected" m={data.byMethod.mpesa} accent="#1B7A3D" />
            <MethodCard icon={<CreditCard size={18} />} label="Card collected" m={data.byMethod.card} accent="#3E6E8E" />
            <MethodCard icon={<Globe size={18} />} label="Online (Paystack)" m={data.byMethod.online} accent={BROWN} />
          </div>

          {/* Collections by staff — scroll target for the POS Sales tile */}
          <div id="seller-breakdown" style={{ scrollMarginTop: 16 }} />
          <Panel title="Collections by staff — collected & receipted by" icon={<Receipt size={16} />}>
            {data.collectors.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 13, padding: "12px 0" }}>No till collections in range.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460, marginTop: 6 }}>
                  <thead>
                    <tr style={{ fontSize: 11.5, color: MUTED, textAlign: "left" }}>
                      <th style={{ padding: "6px 8px" }}>Staff</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Cash</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>M-Pesa</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Card</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Sales</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.collectors.map((c, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--admin-border)" }}>
                        <td style={{ padding: "9px 8px", fontSize: 13, fontWeight: 600, color: TEXT }}>{c.name}</td>
                        <td style={cellR}>{ksh(c.cash)}</td>
                        <td style={cellR}>{ksh(c.mpesa)}</td>
                        <td style={cellR}>{ksh(c.card)}</td>
                        <td style={{ ...cellR, color: MUTED }}>{c.orders}</td>
                        <td style={{ ...cellR, fontWeight: 800, color: GREEN }}>{ksh(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Discounts given at the till — which seller discounted what, and by how much */}
          <div style={{ marginTop: 18 }} />
          <Panel title={`Discounts given at the till — ${ksh(data.totalDiscount)} total`} icon={<Tag size={16} />}>
            {data.discounts.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 13, padding: "12px 0" }}>No till discounts given in range.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560, marginTop: 6 }}>
                  <thead>
                    <tr style={{ fontSize: 11.5, color: MUTED, textAlign: "left" }}>
                      <th style={{ padding: "6px 8px" }}>Seller</th>
                      <th style={{ padding: "6px 8px" }}>Product</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Qty</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Marked</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Sold</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Discount</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>% off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.discounts.map((d, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--admin-border)" }}>
                        <td style={{ padding: "9px 8px", fontSize: 13, fontWeight: 600, color: TEXT }}>{d.seller}</td>
                        <td style={{ padding: "9px 8px", fontSize: 12.5, color: TEXT }}>{d.product}</td>
                        <td style={{ ...cellR, color: MUTED }}>{d.qty}</td>
                        <td style={cellR}>{ksh(d.marked)}</td>
                        <td style={cellR}>{ksh(d.sold)}</td>
                        <td style={{ ...cellR, fontWeight: 700, color: BROWN }}>− {ksh(d.discount)}</td>
                        <td style={{ ...cellR, fontWeight: 700, color: BROWN }}>{d.pct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Active hours */}
          <div style={{ marginTop: 18 }} />
          <Panel title="When is the shop active?" icon={<Clock size={16} />}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 140, marginTop: 8 }}>
              {data.hourly.map((h) => {
                const total = h.online + h.pos
                return (
                  <div key={h.hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }} title={`${h.hour}:00 — ${ksh(total)} (web ${ksh(h.online)}, pos ${ksh(h.pos)})`}>
                    <div style={{ width: "100%", height: 110, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                      <div style={{ width: "100%", height: `${(h.pos / maxHour) * 100}%`, background: BROWN, borderRadius: "2px 2px 0 0" }} />
                      <div style={{ width: "100%", height: `${(h.online / maxHour) * 100}%`, background: "#3E6E8E" }} />
                    </div>
                    <span style={{ fontSize: 8.5, color: MUTED }}>{h.hour}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12, color: MUTED }}>
              <Legend color="#3E6E8E" label="Website" /><Legend color={BROWN} label="POS" /><span>(hour of day, EAT)</span>
            </div>
          </Panel>

          {/* Tables */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginTop: 18 }}>
            <Panel title="Top ordering locations" icon={<MapPin size={16} />}>
              <RankTable rows={data.topLocations.map((l) => ({ a: l.location, b: `${l.orders} orders`, c: ksh(l.revenue) }))} empty="No orders in range." />
            </Panel>
            <Panel title="Best-selling products" icon={<Package size={16} />}>
              <RankTable rows={data.topProducts.map((p) => ({ a: p.name, b: `${p.qty} sold`, c: ksh(p.revenue) }))} empty="No sales in range." />
            </Panel>
          </div>

          {/* Year-end staff sales bonuses (whole-year, independent of the date filter) */}
          <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 14, padding: 16, marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: TEXT, fontWeight: 700, fontSize: 14 }}>
                <Award size={16} color={BROWN} /> Staff sales bonuses — {data.bonusYear}
              </div>
              <div style={{ fontSize: 12.5, color: MUTED }}>
                {Math.round(data.bonusRate * 100)}% of each seller&apos;s full-year POS revenue · Pool: <b style={{ color: GREEN }}>{ksh(data.bonusTotal)}</b>
              </div>
            </div>
            <p style={{ fontSize: 12, color: MUTED, margin: "2px 0 10px" }}>Every staff member can sell at the till. This ranks who sold how much this year, their department, and the {Math.round(data.bonusRate * 100)}% bonus earned.</p>
            {data.bonuses.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 13, padding: "12px 0" }}>No POS sales recorded this year yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: MUTED, fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.4 }}>
                      <th style={{ padding: "6px 8px" }}>#</th>
                      <th style={{ padding: "6px 8px" }}>Staff</th>
                      <th style={{ padding: "6px 8px" }}>Department</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Sales (freq.)</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Year revenue</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Bonus ({Math.round(data.bonusRate * 100)}%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bonuses.map((b, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--admin-border)" }}>
                        <td style={{ padding: "9px 8px", color: MUTED, fontSize: 12.5 }}>{i + 1}</td>
                        <td style={{ padding: "9px 8px", color: TEXT, fontSize: 13, fontWeight: 600 }}>{b.name}</td>
                        <td style={{ padding: "9px 8px", color: MUTED, fontSize: 12.5 }}>{b.department}</td>
                        <td style={{ ...cellR }}>{b.orders}</td>
                        <td style={{ ...cellR }}>{ksh(b.revenue)}</td>
                        <td style={{ ...cellR, fontWeight: 800, color: GREEN }}>{ksh(b.bonus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%")
const dateInput: React.CSSProperties = { border: "1px solid var(--admin-border)", borderRadius: 8, padding: "6px 8px", fontSize: 13, color: TEXT }

function Kpi({ icon, label, value, sub, accent, onClick }: { icon: React.ReactNode; label: string; value: string; sub: string; accent: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick() } : undefined}
      style={{ background: "var(--admin-card)", border: `1px solid ${onClick ? accent : "var(--admin-border)"}`, borderRadius: 14, padding: 16, cursor: onClick ? "pointer" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: accent, marginBottom: 8 }}>{icon}<span style={{ fontSize: 12.5, color: MUTED, fontWeight: 500 }}>{label}</span></div>
      <div style={{ fontSize: 24, fontWeight: 800, color: DARK }}>{value}</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{sub}</div>
    </div>
  )
}

const cellR: React.CSSProperties = { padding: "9px 8px", fontSize: 12.5, color: TEXT, textAlign: "right" }

function MethodCard({ icon, label, m, accent }: { icon: React.ReactNode; label: string; m?: { amount: number; count: number }; accent: string }) {
  return (
    <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 14, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: accent, marginBottom: 6 }}>{icon}<span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>{label}</span></div>
      <div style={{ fontSize: 20, fontWeight: 800, color: DARK }}>{ksh(m?.amount ?? 0)}</div>
      <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{m?.count ?? 0} payments</div>
    </div>
  )
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: TEXT, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{icon}{title}</div>
      {children}
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: color }} />{label}</span>
}

function RankTable({ rows, empty }: { rows: { a: string; b: string; c: string }[]; empty: string }) {
  if (rows.length === 0) return <p style={{ color: MUTED, fontSize: 13, padding: "12px 0" }}>{empty}</p>
  return (
    <div style={{ marginTop: 6 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i ? "1px solid var(--admin-border)" : "none" }}>
          <span style={{ width: 20, height: 20, borderRadius: 6, background: CREAM, color: MUTED, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
          <span style={{ flex: 1, fontSize: 13, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.a}</span>
          <span style={{ fontSize: 11.5, color: MUTED, flexShrink: 0 }}>{r.b}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: GREEN, flexShrink: 0, minWidth: 72, textAlign: "right" }}>{r.c}</span>
        </div>
      ))}
    </div>
  )
}
