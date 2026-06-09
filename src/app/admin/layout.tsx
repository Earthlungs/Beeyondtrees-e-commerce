"use client"

import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Leaf, LayoutDashboard, Package, Truck, 
  LogOut, Menu, X, Users, TrendingUp, Settings, Store
} from "lucide-react"
import { signOut } from "next-auth/react"
import { useState } from "react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (pathname.includes("/login")) return <>{children}</>
  if (status === "loading") {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#A89F91', fontSize: '18px' }}>Loading...</div>
  }
  if (!session) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#A89F91', fontSize: '18px' }}>Access Denied. Please <Link href="/admin/login" style={{ color: '#6B7D5C' }}>sign in</Link>.</div>
  }

  const role = (session.user as any)?.role || "merchant"

  const menuItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/deliveries", label: "Deliveries", icon: Truck },
    ...(role === "admin" ? [
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ] : []),
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F5F1E8' }}>
      {/* Overlay */}
      {sidebarOpen && <div className="md:hidden" onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }} />}
      
      {/* Sidebar */}
      <aside style={{
        width: '260px', backgroundColor: '#3D3226', color: 'white',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'fixed', top: 0, left: sidebarOpen ? 0 : -260, bottom: 0, zIndex: 50,
        transition: 'left 0.3s',
      }} className="md:relative md:left-0">
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'white' }}>
              <div style={{ width: '38px', height: '38px', backgroundColor: '#6B7D5C', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Leaf size={20} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 'bold' }}>BEEyond Trees</div>
                <div style={{ fontSize: '10px', color: '#A89F91', textTransform: 'uppercase', letterSpacing: '1px' }}>{role} Panel</div>
              </div>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
          {menuItems.map(item => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 20px', margin: '2px 10px', borderRadius: '8px',
                backgroundColor: active ? '#6B7D5C' : 'transparent',
                color: active ? 'white' : '#B8A99A',
                textDecoration: 'none', fontSize: '13px', fontWeight: active ? '500' : '400',
                transition: 'all 0.15s',
              }}>
                <Icon size={18} /> {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#6B7D5C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>
              {session.user?.name?.charAt(0) || 'U'}
            </div>
            <div style={{ fontSize: '12px', overflow: 'hidden' }}>
              <div style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user?.name}</div>
              <div style={{ color: '#A89F91', textTransform: 'capitalize', fontSize: '11px' }}>{role}</div>
            </div>
          </div>
          <Button onClick={() => signOut({ callbackUrl: "/admin/login" })}
            style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.08)', color: '#E8D5C4', border: 'none', justifyContent: 'center', gap: '8px', fontSize: '13px', height: '38px' }}>
            <LogOut size={15} /> Sign Out
          </Button>
          <Link href="/" style={{ display: 'block', textAlign: 'center', marginTop: '10px', fontSize: '12px', color: '#A89F91', textDecoration: 'none' }}>
            <Store size={14} style={{ display: 'inline', marginRight: '4px' }} /> View Store
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <header style={{ backgroundColor: 'white', borderBottom: '1px solid #E5E7EB', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setSidebarOpen(true)} className="md:hidden" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A3F2F' }}>
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '12px', color: '#A89F91' }}>
              {session.user?.name} ({role})
            </span>
            <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/admin/login" })} style={{ color: '#8C6A4A', fontSize: '12px' }}>
              <LogOut size={14} style={{ marginRight: '4px' }} /> Logout
            </Button>
          </div>
        </header>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}
