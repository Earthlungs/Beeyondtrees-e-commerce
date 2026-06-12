"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Truck, Phone, MapPin, Package, ChevronDown, ChevronUp,
  Bike, CheckCircle, XCircle, Clock, RefreshCw, Mail, User, X, Lock,
} from "lucide-react"

const SAGE = "#6B7D5C"
const DARK = "#4A3F2F"
const MUTED = "#A89F91"

type OrderItem = {
  id: string; productName: string; price: number; quantity: number
  pricingTier: string; subtotal: number
}
type Dispatch = {
  riderName: string; riderPhone: string; motorbikePlate: string
  riderIdNo: string; estimatedDelivery?: string | null
}
type Order = {
  id: string; customerName: string; customerPhone: string; customerEmail?: string | null
  county: string; town: string; landmark?: string | null; deliveryInstructions?: string | null
  total: number; status: string; paymentStatus?: string | null
  paymentRef?: string | null; transactionRef?: string | null; createdAt: string
  items: OrderItem[]; dispatch?: Dispatch | null
}

const STATUS_TABS = ["all", "pending", "dispatched", "delivered", "cancelled"] as const
type StatusTab = (typeof STATUS_TABS)[number]

const statusStyle: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#FFFBF0", fg: "#E6A817" },
  dispatched: { bg: "#F0F8FF", fg: "#4A90D9" },
  delivered: { bg: "#E8F5E9", fg: SAGE },
  cancelled: { bg: "#F4F2EE", fg: "#9a8d7d" },
}
const paymentStyle: Record<string, { bg: string; fg: string }> = {
  paid: { bg: "#E8F5E9", fg: SAGE },
  pending: { bg: "#FFFBF0", fg: "#E6A817" },
  failed: { bg: "#FDECEC", fg: "#C0392B" },
  cancelled: { bg: "#F4F2EE", fg: "#9a8d7d" },
}

function StatusBadge({ value, map }: { value: string; map: Record<string, { bg: string; fg: string }> }) {
  const s = map[value] ?? { bg: "#F4F2EE", fg: "#9a8d7d" }
  return (
    <Badge style={{ backgroundColor: s.bg, color: s.fg, border: "none", fontSize: 11, textTransform: "capitalize" }}>
      {value}
    </Badge>
  )
}

function DeliveriesContent() {
  const searchParams = useSearchParams()
  const initial = (searchParams.get("status") as StatusTab) || "all"
  const [filter, setFilter] = useState<StatusTab>(STATUS_TABS.includes(initial) ? initial : "all")
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadOrders = () => {
    setLoading(true)
    setError(false)
    fetch("/api/orders")
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadOrders() }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length }
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1
    return c
  }, [orders])

  const visible = filter === "all" ? orders : orders.filter((o) => o.status === filter)

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
    } catch {
      alert("Could not update the order. Please try again.")
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: "bold", color: DARK, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <Truck size={24} style={{ color: SAGE }} /> Deliveries
          </h1>
          <p style={{ color: MUTED, fontSize: 14 }}>Track orders and assign riders for dispatch.</p>
        </div>
        <Button onClick={loadOrders} variant="outline" style={{ borderColor: MUTED, color: DARK, fontSize: 13, gap: 6 }}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {STATUS_TABS.map((tab) => {
          const active = filter === tab
          return (
            <button key={tab} onClick={() => setFilter(tab)} style={{
              padding: "7px 14px", borderRadius: 999, border: `1px solid ${active ? SAGE : "#E2DAC9"}`,
              backgroundColor: active ? SAGE : "white", color: active ? "white" : DARK,
              fontSize: 13, fontWeight: 500, cursor: "pointer", textTransform: "capitalize",
            }}>
              {tab} {counts[tab] ? `(${counts[tab]})` : tab === "all" ? `(${orders.length})` : ""}
            </button>
          )
        })}
      </div>

      {loading ? (
        <p style={{ color: MUTED, textAlign: "center", padding: "48px 16px" }}>Loading orders…</p>
      ) : error ? (
        <p style={{ color: "#C0392B", textAlign: "center", padding: "48px 16px" }}>Could not load orders. <button onClick={loadOrders} style={{ color: SAGE, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>Retry</button></p>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "56px 16px", color: MUTED }}>
          <Package size={44} style={{ margin: "0 auto 14px", opacity: 0.4 }} />
          <p style={{ fontSize: 15 }}>No {filter === "all" ? "" : filter} orders yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visible.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              expanded={expanded === order.id}
              onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
              onStatus={updateStatus}
              onDispatched={(d) => setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "dispatched", dispatch: d } : o)))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderRow({ order, expanded, onToggle, onStatus, onDispatched }: {
  order: Order
  expanded: boolean
  onToggle: () => void
  onStatus: (id: string, status: string) => void
  onDispatched: (d: Dispatch) => void
}) {
  const isPaid = order.paymentStatus === "paid"
  return (
    <Card style={{ borderColor: "#E2DAC9" }}>
      <CardContent style={{ padding: 16 }}>
        {/* Summary row */}
        <div onClick={onToggle} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, color: DARK, fontSize: 15 }}>{order.customerName}</span>
              <StatusBadge value={order.status} map={statusStyle} />
              <StatusBadge value={order.paymentStatus || "pending"} map={paymentStyle} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: MUTED, fontSize: 12.5, marginTop: 5, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={12} /> {order.customerPhone}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {order.town}, {order.county}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: "bold", color: DARK, fontSize: 15 }}>KSh {order.total?.toLocaleString()}</span>
            {expanded ? <ChevronUp size={18} style={{ color: MUTED }} /> : <ChevronDown size={18} style={{ color: MUTED }} />}
          </div>
        </div>

        {expanded && (
          <div style={{ marginTop: 16, borderTop: "1px solid #EFE9DC", paddingTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {/* Customer + items + delivery */}
            <div>
              <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, fontWeight: 700, marginBottom: 8 }}>Customer</h4>
              <div style={{ fontSize: 13, color: DARK, lineHeight: 1.8, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}><User size={13} style={{ color: SAGE }} /> {order.customerName}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: MUTED }}><Phone size={13} /> {order.customerPhone}</div>
                {order.customerEmail && <div style={{ display: "flex", alignItems: "center", gap: 6, color: MUTED }}><Mail size={13} /> {order.customerEmail}</div>}
              </div>
              <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, fontWeight: 700, marginBottom: 10 }}>Items</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {order.items?.map((it) => (
                  <div key={it.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                    <span style={{ color: DARK }}>{it.productName} <span style={{ color: MUTED }}>· {it.pricingTier} × {it.quantity}</span></span>
                    <span style={{ color: DARK, whiteSpace: "nowrap" }}>KSh {it.subtotal?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, fontWeight: 700, marginBottom: 8 }}>Delivery</h4>
              <div style={{ fontSize: 13, color: DARK, lineHeight: 1.7 }}>
                <div>{order.town}, {order.county}</div>
                {order.landmark && <div style={{ color: MUTED }}>Landmark: {order.landmark}</div>}
                {order.deliveryInstructions && <div style={{ color: MUTED }}>Note: {order.deliveryInstructions}</div>}
                {order.paymentRef && <div style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>Ref: {order.paymentRef}</div>}
              </div>
            </div>

            {/* Dispatch + actions */}
            <div>
              <DispatchPanel order={order} onDispatched={onDispatched} isPaid={isPaid} />

              {!isPaid && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 14, padding: "9px 12px", background: "#FFFBF0", border: "1px solid #F0E2BC", borderRadius: 10, color: "#9a7b1f", fontSize: 12.5 }}>
                  <Lock size={13} /> Awaiting payment, dispatch &amp; delivery are locked until this order is paid.
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, fontWeight: 700, marginBottom: 10 }}>Update status</h4>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button onClick={() => onStatus(order.id, "delivered")} disabled={!isPaid || order.status === "delivered"}
                    title={!isPaid ? "Order must be paid first" : undefined}
                    style={{ backgroundColor: SAGE, color: "white", fontSize: 13, gap: 6, height: 38, opacity: !isPaid || order.status === "delivered" ? 0.5 : 1, cursor: !isPaid ? "not-allowed" : undefined }}>
                    <CheckCircle size={15} /> Mark delivered
                  </Button>
                  <Button onClick={() => onStatus(order.id, "cancelled")} disabled={order.status === "cancelled"}
                    variant="outline" style={{ borderColor: "#C0392B", color: "#C0392B", fontSize: 13, gap: 6, height: 38 }}>
                    <XCircle size={15} /> Cancel
                  </Button>
                  <Button onClick={onToggle}
                    variant="outline" style={{ borderColor: MUTED, color: MUTED, fontSize: 13, gap: 6, height: 38 }}>
                    <X size={15} /> Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DispatchPanel({ order, onDispatched, isPaid }: { order: Order; onDispatched: (d: Dispatch) => void; isPaid: boolean }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    riderName: order.dispatch?.riderName || "",
    riderPhone: order.dispatch?.riderPhone || "",
    motorbikePlate: order.dispatch?.motorbikePlate || "",
    riderIdNo: order.dispatch?.riderIdNo || "",
  })

  const save = async () => {
    if (!form.riderName || !form.riderPhone || !form.motorbikePlate || !form.riderIdNo) {
      alert("Fill in all rider details.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/orders/${order.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onDispatched(data.dispatch)
      setOpen(false)
    } catch {
      alert("Could not assign the rider. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (order.dispatch && !open) {
    return (
      <div>
        <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, fontWeight: 700, marginBottom: 10 }}>Rider details</h4>
        <div style={{ background: "#F8F6F0", border: "1px solid #EFE9DC", borderRadius: 10, padding: 14, fontSize: 13, color: DARK, lineHeight: 1.9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14 }}><Bike size={15} style={{ color: SAGE }} /> {order.dispatch.riderName}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: MUTED }}><Phone size={12} /> {order.dispatch.riderPhone}</div>
          <div style={{ color: MUTED }}>Plate: <strong style={{ color: DARK }}>{order.dispatch.motorbikePlate}</strong></div>
          <div style={{ color: MUTED }}>Rider ID: <strong style={{ color: DARK }}>{order.dispatch.riderIdNo}</strong></div>
          {order.dispatch.estimatedDelivery && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: MUTED }}><Clock size={12} /> ETA {new Date(order.dispatch.estimatedDelivery).toLocaleString()}</div>
          )}
        </div>
        <button onClick={() => setOpen(true)} style={{ marginTop: 8, background: "none", border: "none", color: SAGE, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Reassign rider</button>
      </div>
    )
  }

  if (!open) {
    return (
      <div>
        <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, fontWeight: 700, marginBottom: 10 }}>Dispatch</h4>
        <Button onClick={() => setOpen(true)} disabled={!isPaid}
          title={!isPaid ? "Order must be paid first" : undefined}
          style={{ backgroundColor: "#8C6A4A", color: "white", fontSize: 13, gap: 6, height: 38, opacity: isPaid ? 1 : 0.5, cursor: isPaid ? undefined : "not-allowed" }}>
          <Bike size={15} /> Assign rider
        </Button>
      </div>
    )
  }

  return (
    <div>
      <h4 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, fontWeight: 700, marginBottom: 10 }}>Assign rider</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Input placeholder="Rider name" value={form.riderName} onChange={(e) => setForm({ ...form, riderName: e.target.value })} />
        <Input placeholder="Rider phone" value={form.riderPhone} onChange={(e) => setForm({ ...form, riderPhone: e.target.value })} />
        <Input placeholder="Motorbike plate" value={form.motorbikePlate} onChange={(e) => setForm({ ...form, motorbikePlate: e.target.value })} />
        <Input placeholder="Rider ID number" value={form.riderIdNo} onChange={(e) => setForm({ ...form, riderIdNo: e.target.value })} />
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={save} disabled={saving} style={{ backgroundColor: SAGE, color: "white", fontSize: 13, height: 38, flex: 1 }}>
            {saving ? "Saving…" : "Save & dispatch"}
          </Button>
          <Button onClick={() => setOpen(false)} variant="outline" style={{ borderColor: MUTED, color: MUTED, fontSize: 13, height: 38 }}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

export default function DeliveriesPage() {
  return (
    <Suspense fallback={<p style={{ color: MUTED, textAlign: "center", padding: "48px 16px" }}>Loading…</p>}>
      <DeliveriesContent />
    </Suspense>
  )
}
