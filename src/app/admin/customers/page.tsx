"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Users, Phone, Mail, MapPin, ShoppingBag, Search, RefreshCw, Crown,
} from "lucide-react"

const SAGE = "#6B7D5C"
const DARK = "#4A3F2F"
const MUTED = "#A89F91"

type Order = {
  customerName: string; customerPhone: string; customerEmail?: string | null
  county: string; town: string; total: number; paymentStatus?: string | null
  createdAt: string
}

type Customer = {
  phone: string; name: string; email?: string | null
  location: string; orders: number; paidOrders: number
  totalSpent: number; lastOrder: string
}

function aggregate(orders: Order[]): Customer[] {
  const byPhone = new Map<string, Customer>()
  // Orders arrive newest-first, so the first time we see a phone is its latest.
  for (const o of orders) {
    const key = o.customerPhone || "unknown"
    const isPaid = o.paymentStatus === "paid"
    const existing = byPhone.get(key)
    if (!existing) {
      byPhone.set(key, {
        phone: key,
        name: o.customerName,
        email: o.customerEmail,
        location: `${o.town}, ${o.county}`,
        orders: 1,
        paidOrders: isPaid ? 1 : 0,
        totalSpent: isPaid ? o.total : 0,
        lastOrder: o.createdAt,
      })
    } else {
      existing.orders += 1
      if (isPaid) {
        existing.paidOrders += 1
        existing.totalSpent += o.total
      }
      if (!existing.email && o.customerEmail) existing.email = o.customerEmail
    }
  }
  return [...byPhone.values()].sort((a, b) => b.totalSpent - a.totalSpent)
}

export default function CustomersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState("")

  const load = () => {
    setLoading(true)
    setError(false)
    fetch("/api/orders")
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const customers = useMemo(() => aggregate(orders), [orders])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q) ||
      (c.email || "").toLowerCase().includes(q) || c.location.toLowerCase().includes(q)
    )
  }, [customers, query])

  const totals = useMemo(() => ({
    customers: customers.length,
    repeat: customers.filter((c) => c.orders > 1).length,
    revenue: customers.reduce((s, c) => s + c.totalSpent, 0),
  }), [customers])

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: "bold", color: DARK, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={24} style={{ color: SAGE }} /> Customers
          </h1>
          <p style={{ color: MUTED, fontSize: 14 }}>Everyone who has placed an order, ranked by spend.</p>
        </div>
        <button onClick={load} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${MUTED}`, background: "white", color: DARK, fontSize: 13, cursor: "pointer" }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Total Customers", value: totals.customers, icon: Users },
          { label: "Repeat Customers", value: totals.repeat, icon: Crown },
          { label: "Revenue (paid)", value: `KSh ${totals.revenue.toLocaleString()}`, icon: ShoppingBag },
        ].map((s) => (
          <Card key={s.label} style={{ borderColor: "#E2DAC9" }}>
            <CardContent style={{ padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontSize: 22, fontWeight: "bold", color: DARK }}>{s.value}</p>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F5F1E8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <s.icon size={20} style={{ color: SAGE }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 360, marginBottom: 18 }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: MUTED }} />
        <Input placeholder="Search name, phone, email, location…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 36 }} />
      </div>

      {loading ? (
        <p style={{ color: MUTED, textAlign: "center", padding: "48px 16px" }}>Loading customers…</p>
      ) : error ? (
        <p style={{ color: "#C0392B", textAlign: "center", padding: "48px 16px" }}>Could not load customers. <button onClick={load} style={{ color: SAGE, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>Retry</button></p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "56px 16px", color: MUTED }}>
          <Users size={44} style={{ margin: "0 auto 14px", opacity: 0.4 }} />
          <p style={{ fontSize: 15 }}>{customers.length === 0 ? "No customers yet." : "No customers match your search."}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((c, i) => (
            <Card key={c.phone} style={{ borderColor: "#E2DAC9" }}>
              <CardContent style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: SAGE, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 16, flexShrink: 0 }}>
                    {c.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, color: DARK, fontSize: 15 }}>{c.name}</span>
                      {i === 0 && c.totalSpent > 0 && <Badge style={{ background: "#FFF6E0", color: "#E6A817", border: "none", fontSize: 10, gap: 3 }}><Crown size={11} /> Top</Badge>}
                      {c.orders > 1 && <Badge style={{ background: "#E8F5E9", color: SAGE, border: "none", fontSize: 10 }}>Repeat</Badge>}
                    </div>
                    <div style={{ display: "flex", gap: 12, color: MUTED, fontSize: 12.5, marginTop: 4, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={12} /> {c.phone}</span>
                      {c.email && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Mail size={12} /> {c.email}</span>}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {c.location}</span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: "bold", color: DARK, fontSize: 16 }}>KSh {c.totalSpent.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: MUTED }}>
                    {c.orders} order{c.orders === 1 ? "" : "s"}{c.paidOrders !== c.orders ? ` · ${c.paidOrders} paid` : ""} · last {new Date(c.lastOrder).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
