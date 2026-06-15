"use client"

import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard, Package, Truck, LogOut, Menu, X, Users, TrendingUp,
  Settings, Store, ShoppingCart, FileText, ClipboardList, UserCog, Workflow,
  BarChart3, MessageSquare, Code2,
} from "lucide-react"
import { useEffect, useState } from "react"
import { ROLE_LABELS } from "@/lib/tracing-stages"
import { applyTheme, getStoredTheme } from "@/lib/theme"

const TRACING_ROLES = [
  "factory_manager", "executive", "procurement_officer", "quality_inspector",
  "requisition_officer", "agribusiness_manager", "production_officer",
  "dispatch_officer", "receiving_officer",
]

interface NavItem { href: string; label: string; icon: React.ComponentType<{ size?: number }> }
interface NavGroup { title?: string; items: NavItem[] }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Force a password change on first login (provisioned staff) before they can
  // use anything else.
  const mustChange = (session?.user as { mustChangePassword?: boolean } | undefined)?.mustChangePassword
  useEffect(() => {
    if (mustChange && !pathname.startsWith("/admin/account")) router.replace("/admin/account")
  }, [mustChange, pathname, router])

  // Keep "system" theme in sync with the OS while the app is open.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const on = () => { if (getStoredTheme() === "system") applyTheme("system") }
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])

  if (pathname.includes("/login")) return <>{children}</>
  if (status === "loading") {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#A89F91', fontSize: '18px' }}>Loading...</div>
  }
  if (!session) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#A89F91', fontSize: '18px' }}>Access Denied. Please <Link href="/admin/login" style={{ color: '#6B7D5C' }}>sign in</Link>.</div>
  }

  const role = (session.user as { role?: string })?.role || "merchant"
  const roleLabel = ROLE_LABELS[role] ?? role
  const avatar = (session.user as { image?: string | null })?.image || null
  const isAdmin = role === "admin" || role === "it_specialist" // full control
  const isTracing = TRACING_ROLES.includes(role)

  const chat: NavItem = { href: "/admin/chat", label: "Chat", icon: MessageSquare }

  // Nav is grouped: store commands vs the "Value Chain" pipeline. Cashier/tracing
  // roles are confined (proxy.ts enforces it server-side too).
  let groups: NavGroup[]
  if (role === "cashier") {
    groups = [{ items: [{ href: "/admin/pos", label: "Point of Sale", icon: ShoppingCart }, chat] }]
  } else if (isTracing) {
    groups = [{ title: "Value Chain", items: [{ href: "/admin/tracing", label: "Tracing Board", icon: Workflow }, chat] }]
  } else {
    groups = [
      {
        title: "Store Admin",
        items: [
          { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
          { href: "/admin/pos", label: "Point of Sale", icon: ShoppingCart },
          { href: "/admin/products", label: "Products", icon: Package },
          { href: "/admin/deliveries", label: "Deliveries", icon: Truck },
          { href: "/admin/lpo", label: "LPO", icon: ClipboardList },
          { href: "/admin/invoicing", label: "Invoicing", icon: FileText },
          ...(isAdmin ? [
            { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
            { href: "/admin/customers", label: "Customers", icon: Users },
          ] : []),
        ],
      },
      {
        title: "Value Chain",
        items: [
          { href: "/admin/tracing", label: "Tracing Board", icon: Workflow },
          ...(isAdmin ? [{ href: "/admin/value-chain/reports", label: "Reports", icon: BarChart3 }] : []),
          chat,
        ],
      },
      ...(isAdmin ? [{
        title: "System",
        items: [
          { href: "/admin/users", label: "Users", icon: UserCog },
          { href: "/admin/developers", label: "Developers", icon: Code2 },
          { href: "/admin/settings", label: "Settings", icon: Settings },
        ],
      }] : []),
    ]
  }

  const linkStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 20px', margin: '2px 10px', borderRadius: '8px',
    backgroundColor: active ? '#6B7D5C' : 'transparent',
    color: active ? 'white' : '#B8A99A',
    textDecoration: 'none', fontSize: '13px', fontWeight: active ? 500 : 400, transition: 'all 0.15s',
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--admin-bg)' }}>
      {sidebarOpen && <div className="md:hidden" onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }} />}

      <aside style={{
        width: '260px', backgroundColor: 'var(--admin-sidebar)', color: 'white',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'fixed', top: 0, left: sidebarOpen ? 0 : -260, bottom: 0, zIndex: 50,
        transition: 'left 0.3s',
      }} className="md:relative md:left-0">
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href={isTracing ? "/admin/tracing" : "/admin"} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'white' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon-192.png" alt="BEEyond Trees" width={38} height={38} style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: 8 }} />
              <div>
                <div style={{ fontSize: '15px', fontWeight: 'bold' }}>BEEyond Trees</div>
                <div style={{ fontSize: '10px', color: '#A89F91', textTransform: 'uppercase', letterSpacing: '1px' }}>{roleLabel} Panel</div>
              </div>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {groups.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 10 }}>
              {group.title && (
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#7C6F5E', padding: '6px 22px 4px' }}>{group.title}</div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                return (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} style={linkStyle(active)}>
                    <Icon size={18} /> {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Link href="/admin/account" onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', textDecoration: 'none', color: 'white' }}>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#6B7D5C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>
                {session.user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div style={{ fontSize: '12px', overflow: 'hidden' }}>
              <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user?.name}</div>
              <div style={{ color: '#A89F91', fontSize: '11px' }}>{roleLabel} · My account</div>
            </div>
          </Link>
          <Button onClick={() => signOut({ callbackUrl: "/admin/login" })}
            style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.08)', color: '#E8D5C4', border: 'none', justifyContent: 'center', gap: '8px', fontSize: '13px', height: '38px' }}>
            <LogOut size={15} /> Sign Out
          </Button>
          {!isTracing && role !== "cashier" && (
            <Link href="/" style={{ display: 'block', textAlign: 'center', marginTop: '10px', fontSize: '12px', color: '#A89F91', textDecoration: 'none' }}>
              <Store size={14} style={{ display: 'inline', marginRight: '4px' }} /> View Store
            </Link>
          )}
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <header style={{ backgroundColor: 'var(--admin-card)', borderBottom: '1px solid var(--admin-border)', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setSidebarOpen(true)} className="md:hidden" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A3F2F' }}>
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '12px', color: '#A89F91' }}>{session.user?.name} ({roleLabel})</span>
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
