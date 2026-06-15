"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Package, ShoppingCart, Truck, DollarSign, TrendingUp, 
  Users, AlertTriangle, CheckCircle, Clock, Leaf, ArrowRight,
  BarChart3, Activity, UserPlus
} from "lucide-react"
import Link from "next/link"
import { useProductStore } from "@/store/product-store"

export default function AdminDashboard() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role || "merchant"
  const isAdmin = role === "admin" || role === "it_specialist" // IT has full control
  const products = useProductStore((s) => s.products)
  const loadProducts = useProductStore((s) => s.loadProducts)
  const [stats, setStats] = useState({
    products: 0, orders: 0, pending: 0, delivered: 0, revenue: 0, customers: 0
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const lowStock = products.filter((p) => p.stock <= 5)

  useEffect(() => { loadProducts() }, [loadProducts])

  useEffect(() => {
    // Aggregated summary (counts/revenue/recent) computed in the DB — far
    // lighter than pulling every order. Guard against a bad response.
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
      })
      .catch(() => { if (!cancelled) setRecentOrders([]) })

    return () => { cancelled = true }
  }, [products])

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#4A3F2F', marginBottom: '4px' }}>
          Welcome back, {session?.user?.name}
        </h1>
        <p style={{ color: '#A89F91', fontSize: '14px' }}>
          {isAdmin ? "Full platform overview" : "Manage your products and orders"}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Products', value: stats.products, icon: Package, color: '#6B7D5C', href: '/admin/products' },
          { label: 'Total Orders', value: stats.orders, icon: ShoppingCart, color: '#8C6A4A', href: '/admin/deliveries' },
          { label: 'Pending Orders', value: stats.pending, icon: Clock, color: '#E6A817', href: '/admin/deliveries?status=pending' },
          { label: 'Revenue', value: `KSh ${stats.revenue.toLocaleString()}`, icon: DollarSign, color: '#6B7D5C', href: '/admin/analytics' },
          ...(isAdmin ? [
            { label: 'Customers', value: stats.customers, icon: Users, color: '#A89F91', href: '/admin/customers' },
            { label: 'Delivered', value: stats.delivered, icon: CheckCircle, color: '#4A90D9', href: '/admin/deliveries?status=delivered' },
          ] : []),
        ].map((stat, i) => (
          <Link key={i} href={stat.href} style={{ textDecoration: 'none' }}>
            <Card style={{ borderColor: '#A89F91', transition: 'box-shadow 0.2s', cursor: 'pointer', height: '100%' }}>
              <CardContent style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#A89F91', marginBottom: '4px' }}>{stat.label}</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#4A3F2F' }}>{stat.value}</p>
                  </div>
                  <div style={{ width: '40px', height: '40px', backgroundColor: '#F5F1E8', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <stat.icon size={20} style={{ color: stat.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        {/* Recent Orders */}
        <Card style={{ borderColor: '#A89F91' }}>
          <CardHeader style={{ paddingBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <CardTitle style={{ fontSize: '16px', color: '#4A3F2F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18} /> Recent Orders
              </CardTitle>
              <Link href="/admin/deliveries" style={{ fontSize: '13px', color: '#6B7D5C', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                View All <ArrowRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentOrders.map((order, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#F5F1E8', borderRadius: '8px' }}>
                    <div>
                      <p style={{ fontWeight: '500', color: '#4A3F2F', fontSize: '14px' }}>{order.customerName}</p>
                      <p style={{ fontSize: '12px', color: '#A89F91' }}>{order.itemCount} items - {new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 'bold', color: '#4A3F2F', fontSize: '14px' }}>KSh {order.total?.toLocaleString()}</span>
                      <Badge style={{ 
                        backgroundColor: order.status === 'pending' ? '#FFFBF0' : order.status === 'delivered' ? '#E8F5E9' : '#F0F8FF',
                        color: order.status === 'pending' ? '#E6A817' : order.status === 'delivered' ? '#6B7D5C' : '#4A90D9',
                        border: 'none', fontSize: '11px'
                      }}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#A89F91', textAlign: 'center', padding: '20px', fontSize: '14px' }}>No orders yet</p>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card style={{ borderColor: '#A89F91' }}>
          <CardHeader style={{ paddingBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <CardTitle style={{ fontSize: '16px', color: '#4A3F2F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: '#8C6A4A' }} /> Stock Alerts
              </CardTitle>
              <Link href="/admin/products" style={{ fontSize: '13px', color: '#6B7D5C', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Manage <ArrowRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {lowStock.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lowStock.map((product, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#FFFBF0', borderRadius: '8px', border: '1px solid #E6D3A3' }}>
                    <div>
                      <p style={{ fontWeight: '500', color: '#4A3F2F', fontSize: '14px' }}>{product.name}</p>
                      <p style={{ fontSize: '12px', color: '#A89F91' }}>{product.category}</p>
                    </div>
                    <Badge style={{ backgroundColor: '#8C6A4A', color: 'white', border: 'none', fontSize: '12px' }}>
                      {product.stock} left
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#A89F91', textAlign: 'center', padding: '20px', fontSize: '14px' }}>All products well stocked</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
