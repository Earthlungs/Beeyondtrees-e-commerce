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
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme"

const TRACING_ROLES = [
  "factory_manager", "executive", "agribusiness_manager", "production_officer",
  "factory_procurement", "external_procurement", "procurement_officer",
]
// Chief + Finance: approval/oversight roles confined to the LPO documents.
const APPROVAL_ROLES = ["chief", "finance"]

interface NavItem { href: string; label: string; icon: React.ComponentType<{ size?: number }> }
interface NavGroup { title?: string; items: NavItem[] }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [unreadChat, setUnreadChat] = useState(0)

  // Poll the total unread chat count for the sidebar "Chat" badge.
  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false
    const load = () => fetch("/api/chat?count=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setUnreadChat(d.total ?? 0) })
      .catch(() => {})
    load()
    const t = setInterval(load, 10000)
    return () => { cancelled = true; clearInterval(t) }
  }, [status, pathname])

  // Sidebar is open by default on desktop, collapsed on mobile. The header
  // hamburger toggles it on EVERY screen size (so it collapses on desktop too).
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const apply = () => { setIsMobile(mq.matches); setSidebarOpen(!mq.matches) }
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  // Force a password change on first login (provisioned staff) before they can
  // use anything else.
  const mustChange = (session?.user as { mustChangePassword?: boolean } | undefined)?.mustChangePassword
  useEffect(() => {
    if (mustChange && !pathname.startsWith("/admin/account")) router.replace("/admin/account")
  }, [mustChange, pathname, router])

  // Apply THIS user's saved theme on login — overrides any theme another user
  // left in this browser's localStorage, so themes are per-account.
  const userTheme = (session?.user as { theme?: string } | undefined)?.theme
  useEffect(() => {
    if (userTheme === "dark" || userTheme === "light" || userTheme === "system") {
      try { localStorage.setItem("theme", userTheme) } catch {}
      applyTheme(userTheme as Theme)
    }
  }, [userTheme])

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
  const isAdmin = role === "admin" || role === "it_specialist" || role === "assistant_ceo" // full control (Assistant CEO = all CEO rights)
  const isTracing = TRACING_ROLES.includes(role)
  const isApproval = APPROVAL_ROLES.includes(role)
  // LPO + invoicing: Procurement Officer (internal) / External Procurement originate,
  // Factory Admin (executive) approves internal LPOs.
  const canDoc = role === "procurement_officer" || role === "external_procurement" || role === "executive"

  const chat: NavItem = { href: "/admin/chat", label: "Chat", icon: MessageSquare }
  // Point of Sale is available to EVERY staff member now.
  const pos: NavItem = { href: "/admin/pos", label: "Point of Sale", icon: ShoppingCart }

  // Nav is grouped: store commands vs the "Value Chain" pipeline. Cashier/tracing
  // roles are confined (proxy.ts enforces it server-side too).
  let groups: NavGroup[]
  if (role === "cashier") {
    groups = [{ items: [pos, chat] }]
  } else if (isApproval) {
    // Chief (approves external LPOs) / Finance (notified on CEO approval): LPO + POS.
    groups = [{ title: role === "chief" ? "Approvals" : "Finance", items: [{ href: "/admin/lpo", label: "LPO", icon: ClipboardList }, pos, chat] }]
  } else if (isTracing && !canDoc) {
    // factory_manager can view approved LPOs to pick one when starting a batch
    const lpoItems: NavItem[] = role === "factory_manager"
      ? [{ href: "/admin/lpo", label: "LPO", icon: ClipboardList }]
      : []
    groups = [{ title: "Value Chain", items: [...lpoItems, { href: "/admin/tracing", label: "Tracing Board", icon: Workflow }, pos, chat] }]
  } else if (isTracing && canDoc) {
    groups = [
      {
        title: "Documents",
        items: [
          { href: "/admin/lpo", label: "LPO", icon: ClipboardList },
          { href: "/admin/invoicing", label: "Invoicing", icon: FileText },
        ],
      },
      {
        title: "Value Chain",
        items: [{ href: "/admin/tracing", label: "Tracing Board", icon: Workflow }, pos, chat],
      },
    ]
  } else {
    groups = [
      {
        title: "Store Admin",
        items: [
          { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
          { href: "/admin/pos", label: "Point of Sale", icon: ShoppingCart },
          { href: "/admin/products", label: "Products", icon: Package },
          { href: "/admin/deliveries", label: "Deliveries", icon: Truck },
          ...(isAdmin ? [
            { href: "/admin/lpo", label: "LPO", icon: ClipboardList },
            { href: "/admin/invoicing", label: "Invoicing", icon: FileText },
            { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
            { href: "/admin/customers", label: "Customers", icon: Users },
          ] : [chat]),
        ],
      },
      ...(isAdmin ? [{
        title: "Value Chain",
        items: [
          { href: "/admin/tracing", label: "Tracing Board", icon: Workflow },
          { href: "/admin/value-chain/reports", label: "Reports", icon: BarChart3 },
          chat,
        ],
      }] : []),
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
      {sidebarOpen && isMobile && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }} />}

      <aside style={{
        width: '260px', backgroundColor: 'var(--admin-sidebar)', color: 'white',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'fixed', top: 0, left: sidebarOpen ? 0 : -260, bottom: 0, zIndex: 50,
        transition: 'left 0.3s',
      }}>
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
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
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
                const isChat = item.href === "/admin/chat"
                return (
                  <Link key={item.href} href={item.href} onClick={() => { if (isMobile) setSidebarOpen(false) }} style={{ ...linkStyle(active), display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={18} /> <span style={{ flex: 1 }}>{item.label}</span>
                    {isChat && unreadChat > 0 && (
                      <span style={{ background: '#C0392B', color: 'white', fontSize: 11, fontWeight: 700, borderRadius: 999, minWidth: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
                        +{unreadChat}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Link href="/admin/account" onClick={() => { if (isMobile) setSidebarOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', textDecoration: 'none', color: 'white' }}>
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

      <div style={{ flex: 1, minWidth: 0, marginLeft: (sidebarOpen && !isMobile) ? 260 : 0, transition: 'margin-left 0.3s' }}>
        <header style={{ backgroundColor: 'var(--admin-card)', borderBottom: '1px solid var(--admin-border)', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
          <button onClick={() => setSidebarOpen((o) => !o)} aria-label="Toggle menu" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text)', display: 'flex', padding: 4 }}>
            <Menu size={22} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '12px', color: '#A89F91' }}>{session.user?.name} ({roleLabel})</span>
            <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/admin/login" })} style={{ color: '#8C6A4A', fontSize: '12px' }}>
              <LogOut size={14} style={{ marginRight: '4px' }} /> Logout
            </Button>
          </div>
        </header>
        {role === "external_procurement" && (
          <div style={{ background: 'linear-gradient(90deg,#3F5E2E,#6B7D5C)', color: '#fff', padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 13, fontWeight: 600, letterSpacing: 0.3 }}>
            <span style={{ fontWeight: 800 }}>Bamboosa</span>
            <span style={{ opacity: 0.85, fontWeight: 400 }}>in partnership with</span>
            <span style={{ fontWeight: 800 }}>Beeyond Trees</span>
          </div>
        )}
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}
