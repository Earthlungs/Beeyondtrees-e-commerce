"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Package, ShoppingCart, Truck, DollarSign,
  Users, AlertTriangle, CheckCircle, Clock, ArrowRight,
  ChevronDown, ChevronUp, UserCheck, UserX
} from "lucide-react"
import Link from "next/link"
import { useProductStore } from "@/store/product-store"
import { isAdminishRole } from "@/lib/tracing-stages"

const PREVIEW = 3

export default function AdminDashboard() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role || "merchant"
  const isAdmin = isAdminishRole(role)
  const products = useProductStore((s) => s.products)
  const loadProducts = useProductStore((s) => s.loadProducts)
  const [stats, setStats] = useState({
    products: 0, orders: 0, pending: 0, delivered: 0, revenue: 0, customers: 0
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [userStats, setUserStats] = useState<{ total: number; active: number; blocked: number } | null>(null)
  const [ordersExpanded, setOrdersExpanded] = useState(false)
  const [stockExpanded, setStockExpanded] = useState(false)
  const [production, setProduction] = useState<{ id: string; code: string; productName: string | null; productionPercent: number | null }[]>([])
  const lowStock = products.filter((p) => p.stock <= 5)

  useEffect(() => { loadProducts() }, [loadProducts])

  // CEO / Assistant CEO / admin / IT: live production completion per product.
  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    fetch('/api/tracing/batches')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return
        setProduction(rows.filter((b: { stage: string; status: string }) => b.stage === "production" && b.status === "in_progress"))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isAdmin])

  useEffect(() => {
    let cancelled = false
    fetch('/api/orders/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return
        setStats({
          products: products.length,
          orders: d.orders ?? 0,
          pending: d.pending ?? 0,
          delivered: d.delivered ?? 0,
          revenue: d.revenue ?? 0,
          customers: d.customers ?? 0,
        })
        setRecentOrders(Array.isArray(d.recent) ? d.recent : [])
        if (d.users) setUserStats(d.users)
      })
      .catch(() => { if (!cancelled) setRecentOrders([]) })

    return () => { cancelled = true }
  }, [products])

  const visibleOrders = ordersExpanded ? recentOrders : recentOrders.slice(0, PREVIEW)
  const visibleStock = stockExpanded ? lowStock : lowStock.slice(0, PREVIEW)

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: "var(--admin-text)", marginBottom: '4px' }}>
          Welcome back, {session?.user?.name}
        </h1>
        <p style={{ color: "var(--admin-muted)", fontSize: '14px' }}>
          {isAdmin ? "Full platform overview" : "Manage your products and orders"}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Products', value: stats.products, icon: Package, color: '#6B7D5C', href: '/admin/products' },
          { label: 'Total Orders', value: stats.orders, icon: ShoppingCart, color: '#8C6A4A', href: '/admin/deliveries' },
          { label: 'Pending Orders', value: stats.pending, icon: Clock, color: '#E6A817', href: '/admin/deliveries?status=pending' },
          { label: 'Revenue', value: `KSh ${stats.revenue.toLocaleString()}`, icon: DollarSign, color: '#6B7D5C', href: '/admin/analytics' },
          ...(isAdmin ? [
            { label: 'Customers', value: stats.customers, icon: Users, color: "var(--admin-muted)", href: '/admin/customers' },
            { label: 'Delivered', value: stats.delivered, icon: CheckCircle, color: '#4A90D9', href: '/admin/deliveries?status=delivered' },
          ] : []),
        ].map((stat, i) => (
          <Link key={i} href={stat.href} style={{ textDecoration: 'none' }}>
            <Card style={{ borderColor: '#A89F91', transition: 'box-shadow 0.2s', cursor: 'pointer', height: '100%' }}>
              <CardContent style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: "var(--admin-muted)", marginBottom: '4px' }}>{stat.label}</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', color: "var(--admin-text)" }}>{stat.value}</p>
                  </div>
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--admin-bg)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <stat.icon size={20} style={{ color: stat.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* User Stats (admin / IT only) */}
      {isAdmin && userStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Users', value: userStats.total, icon: Users, color: '#2C5282', href: '/admin/users' },
            { label: 'Active Users', value: userStats.active, icon: UserCheck, color: '#6B7D5C', href: '/admin/users' },
            { label: 'Blocked Users', value: userStats.blocked, icon: UserX, color: '#C0392B', href: '/admin/users' },
          ].map((s, i) => (
            <Link key={i} href={s.href} style={{ textDecoration: 'none' }}>
              <Card style={{ borderColor: '#A89F91', cursor: 'pointer', height: '100%' }}>
                <CardContent style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: "var(--admin-muted)", marginBottom: '4px' }}>{s.label}</p>
                      <p style={{ fontSize: '22px', fontWeight: 'bold', color: "var(--admin-text)" }}>{s.value}</p>
                    </div>
                    <div style={{ width: '36px', height: '36px', backgroundColor: 'var(--admin-bg)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <s.icon size={18} style={{ color: s.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Live production progress per product (CEO / Assistant CEO / admin / IT) */}
      {isAdmin && production.length > 0 && (
        <Card style={{ borderColor: '#A89F91', marginBottom: '24px' }}>
          <CardHeader style={{ paddingBottom: '8px' }}>
            <CardTitle style={{ fontSize: '16px', color: "var(--admin-text)" }}>Production in progress</CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'grid', gap: '12px' }}>
            {production.map((b) => (
              <Link key={b.id} href={`/admin/tracing/${b.id}`} style={{ textDecoration: 'none' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: "var(--admin-text)", fontWeight: 600 }}>{b.productName || b.code}</span>
                    <span style={{ color: (b.productionPercent ?? 0) >= 100 ? '#6B7D5C' : '#B8860B', fontWeight: 700 }}>{b.productionPercent ?? 0}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--admin-border)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${b.productionPercent ?? 0}%`, height: '100%', background: '#6B7D5C' }} />
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '20px' }}>
        {/* Recent Orders */}
        <Card style={{ borderColor: '#A89F91' }}>
          <CardHeader style={{ paddingBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <CardTitle style={{ fontSize: '16px', color: "var(--admin-text)", display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18} /> Recent Orders
                {recentOrders.length > 0 && (
                  <span style={{ fontSize: '12px', color: "var(--admin-muted)", fontWeight: 400 }}>({recentOrders.length})</span>
                )}
              </CardTitle>
              <Link href="/admin/deliveries" style={{ fontSize: '13px', color: '#6B7D5C', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                View All <ArrowRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {visibleOrders.map((order, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: 'var(--admin-bg)', borderRadius: '8px' }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: '500', color: "var(--admin-text)", fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.customerName}</p>
                        <p style={{ fontSize: '12px', color: "var(--admin-muted)" }}>{order.itemCount} items · {new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{ fontWeight: 'bold', color: "var(--admin-text)", fontSize: '13px', whiteSpace: 'nowrap' }}>KSh {order.total?.toLocaleString()}</span>
                        <Badge style={{
                          backgroundColor: order.status === 'pending' ? '#FFFBF0' : order.status === 'delivered' ? '#E8F5E9' : '#F0F8FF',
                          color: order.status === 'pending' ? '#E6A817' : order.status === 'delivered' ? '#6B7D5C' : '#4A90D9',
                          border: 'none', fontSize: '11px', flexShrink: 0
                        }}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {recentOrders.length > PREVIEW && (
                  <button onClick={() => setOrdersExpanded((v) => !v)} style={{ marginTop: '10px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '12px', color: '#6B7D5C', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}>
                    {ordersExpanded ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Show all {recentOrders.length} orders</>}
                  </button>
                )}
              </>
            ) : (
              <p style={{ color: "var(--admin-muted)", textAlign: 'center', padding: '20px', fontSize: '14px' }}>No orders yet</p>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card style={{ borderColor: '#A89F91' }}>
          <CardHeader style={{ paddingBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <CardTitle style={{ fontSize: '16px', color: "var(--admin-text)", display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: 'var(--admin-warn-fg)' }} /> Stock Alerts
                {lowStock.length > 0 && (
                  <span style={{ fontSize: '12px', color: "var(--admin-muted)", fontWeight: 400 }}>({lowStock.length})</span>
                )}
              </CardTitle>
              <Link href="/admin/products" style={{ fontSize: '13px', color: '#6B7D5C', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Manage <ArrowRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {lowStock.length > 0 ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {visibleStock.map((product, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: 'var(--admin-warn-bg)', borderRadius: '8px', border: '1px solid var(--admin-warn-border)' }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: '500', color: "var(--admin-text)", fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                        <p style={{ fontSize: '12px', color: "var(--admin-muted)" }}>{product.category}</p>
                      </div>
                      <Badge style={{ backgroundColor: product.stock === 0 ? '#C0392B' : '#D97706', color: 'white', border: 'none', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                        {product.stock === 0 ? 'Out of stock' : `${product.stock} left`}
                      </Badge>
                    </div>
                  ))}
                </div>
                {lowStock.length > PREVIEW && (
                  <button onClick={() => setStockExpanded((v) => !v)} style={{ marginTop: '10px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '12px', color: '#6B7D5C', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}>
                    {stockExpanded ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Show all {lowStock.length} alerts</>}
                  </button>
                )}
              </>
            ) : (
              <p style={{ color: "var(--admin-muted)", textAlign: 'center', padding: '20px', fontSize: '14px' }}>All products well stocked</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
