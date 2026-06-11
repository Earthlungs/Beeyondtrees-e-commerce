"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { ShoppingBag, Search, User, Heart, LogOut, X } from "lucide-react"
import { useCartStore } from "@/store/cart-store"
import { useWishlistStore } from "@/store/wishlist-store"
import { useAccountStore } from "@/store/account-store"
import { CartSheet } from "@/components/cart/CartSheet"

const SAGE = "#6B7D5C"
const DARK = "#4A3F2F"

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/products" },
  { label: "New Arrivals", href: "/new-arrivals" },
  { label: "About Us", href: "/about" },
  { label: "Where We Work", href: "/where-we-work" },
  { label: "Contact", href: "/contact" },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  const itemCount = useCartStore((s) => s.getItemCount())
  const setCartOpen = useCartStore((s) => s.setIsOpen)
  const wishCount = useWishlistStore((s) => s.ids.length)
  const customer = useAccountStore((s) => s.customer)

  return (
    <>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #E7E1D4" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: SAGE, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17 }}>B</div>
            <span className="font-display" style={{ fontSize: 21, fontWeight: 600, color: SAGE }}>
              BEEyond<span style={{ color: DARK }}> Trees</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex" style={{ alignItems: "center", gap: 28 }}>
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} style={{ fontSize: 14.5, color: "#6b6353", textDecoration: "none", fontWeight: 500 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = SAGE)}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6b6353")}>
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <IconButton label="Search" onClick={() => setSearchOpen((s) => !s)}>
              <Search size={19} />
            </IconButton>

            <Link href="/wishlist" style={{ textDecoration: "none" }}>
              <IconButton label="Wishlist" badge={wishCount}>
                <Heart size={19} />
              </IconButton>
            </Link>

            <IconButton label="Cart" badge={itemCount} onClick={() => setCartOpen(true)}>
              <ShoppingBag size={19} />
            </IconButton>

            {/* Account */}
            <div style={{ position: "relative" }} onMouseLeave={() => setAccountOpen(false)}>
              <IconButton label="Account" onClick={() => setAccountOpen((s) => !s)}>
                <User size={19} />
              </IconButton>
              <AnimatePresence>
                {accountOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", width: 230, background: "white", borderRadius: 16, border: "1px solid #E7E1D4", boxShadow: "0 20px 45px -18px rgba(74,63,47,0.35)", padding: 16, zIndex: 60 }}>
                    {customer ? (
                      <>
                        <p style={{ fontSize: 12, color: "#A89F91" }}>Signed in as</p>
                        <p style={{ fontWeight: 600, color: DARK, marginBottom: 12 }}>{customer.name}</p>
                        <DropLink href="/wishlist" icon={<Heart size={15} />} label="My wishlist" onClick={() => setAccountOpen(false)} />
                        <button onClick={() => { useAccountStore.getState().signOut(); setAccountOpen(false) }}
                          style={dropBtnStyle}><LogOut size={15} /> Sign out</button>
                      </>
                    ) : (
                      <>
                        <p style={{ fontWeight: 600, color: DARK, marginBottom: 2 }}>Welcome, guest</p>
                        <p style={{ fontSize: 12.5, color: "#A89F91", marginBottom: 14, lineHeight: 1.5 }}>Create a profile to save your wishlist and speed up checkout.</p>
                        <button onClick={() => { setShowAuth(true); setAccountOpen(false) }}
                          style={{ width: "100%", padding: "10px", background: SAGE, color: "white", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer", marginBottom: 8 }}>
                          Create account
                        </button>
                        <button onClick={() => { setShowAuth(true); setAccountOpen(false) }}
                          style={{ width: "100%", padding: "9px", background: "transparent", color: SAGE, border: `1px solid ${SAGE}`, borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                          Sign in
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hamburger */}
            <button className="lg:hidden" aria-label="Menu" onClick={() => setMenuOpen((s) => !s)}
              style={{ width: 42, height: 42, marginLeft: 2, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5 }}>
              {[0, 1, 2].map((i) => (
                <motion.span key={i}
                  animate={menuOpen
                    ? { rotate: i === 0 ? 45 : i === 2 ? -45 : 0, y: i === 0 ? 7 : i === 2 ? -7 : 0, opacity: i === 1 ? 0 : 1 }
                    : { rotate: 0, y: 0, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  style={{ width: 22, height: 2, background: DARK, borderRadius: 2, display: "block" }} />
              ))}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              style={{ overflow: "hidden", borderTop: "1px solid #E7E1D4", background: "#F9F6EF" }}>
              <form action="/products" style={{ maxWidth: 640, margin: "0 auto", padding: "14px 20px", display: "flex", gap: 10 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#A89F91" }} />
                  <input name="q" placeholder="Search natural goods…" autoFocus
                    style={{ width: "100%", padding: "11px 14px 11px 38px", borderRadius: 999, border: "1px solid #D4C9B8", outline: "none", fontSize: 14.5, background: "white" }} />
                </div>
                <button type="submit" style={{ background: SAGE, color: "white", border: "none", borderRadius: 999, padding: "0 22px", fontWeight: 600, cursor: "pointer" }}>Search</button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)}
              className="lg:hidden" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 80 }} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="lg:hidden" style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "80%", maxWidth: 320, background: "#F5F1E8", zIndex: 90, padding: "22px", boxShadow: "-20px 0 50px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
                <span className="font-display" style={{ fontSize: 20, fontWeight: 600, color: SAGE }}>BEEyond Trees</span>
                <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: DARK }}><X size={22} /></button>
              </div>
              <nav style={{ display: "flex", flexDirection: "column" }}>
                {navLinks.map((l) => (
                  <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                    style={{ padding: "13px 0", borderBottom: "1px solid #E2DAC9", color: DARK, textDecoration: "none", fontSize: 16, fontWeight: 500 }}>
                    {l.label}
                  </Link>
                ))}
                <Link href="/wishlist" onClick={() => setMenuOpen(false)} style={{ padding: "13px 0", borderBottom: "1px solid #E2DAC9", color: DARK, textDecoration: "none", fontSize: 16, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                  <Heart size={17} /> Wishlist {wishCount > 0 && `(${wishCount})`}
                </Link>
              </nav>
              <div style={{ marginTop: "auto" }}>
                {customer ? (
                  <p style={{ color: "#6b6353" }}>Hi, {customer.name}</p>
                ) : (
                  <button onClick={() => { setShowAuth(true); setMenuOpen(false) }}
                    style={{ width: "100%", padding: "13px", background: SAGE, color: "white", border: "none", borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
                    Create account
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      <CartSheet />
    </>
  )
}

function IconButton({ children, label, onClick, badge }: { children: React.ReactNode; label: string; onClick?: () => void; badge?: number }) {
  return (
    <motion.button whileTap={{ scale: 0.88 }} aria-label={label} onClick={onClick}
      style={{ position: "relative", width: 42, height: 42, borderRadius: 12, background: "none", border: "none", cursor: "pointer", color: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#EFE9DC")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
      {children}
      {badge ? (
        <span style={{ position: "absolute", top: 5, right: 5, minWidth: 17, height: 17, padding: "0 4px", borderRadius: 999, background: SAGE, color: "white", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge}</span>
      ) : null}
    </motion.button>
  )
}

const dropBtnStyle: React.CSSProperties = {
  width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", background: "transparent",
  border: "none", borderRadius: 10, color: DARK, fontSize: 14, cursor: "pointer", textAlign: "left",
}

function DropLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} style={{ ...dropBtnStyle, textDecoration: "none", display: "flex" }}>
      {icon} {label}
    </Link>
  )
}

function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const signUp = useAccountStore((s) => s.signUp)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    signUp({ name: name.trim(), email: email.trim() })
    setName(""); setEmail(""); onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(28,34,24,0.5)", backdropFilter: "blur(3px)", zIndex: 100 }} />
          <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "90%", maxWidth: 400, background: "white", borderRadius: 22, padding: 30, zIndex: 110, boxShadow: "0 40px 80px -30px rgba(0,0,0,0.5)" }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, background: "#EFE9DC", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <User size={24} style={{ color: SAGE }} />
            </div>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, color: DARK, marginBottom: 6 }}>Create your profile</h2>
            <p style={{ color: "#8a8170", fontSize: 14.5, marginBottom: 22 }}>Save your wishlist and check out faster.</p>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required
                style={inputStyle} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email address" required
                style={inputStyle} />
              <button type="submit" style={{ marginTop: 6, height: 50, background: SAGE, color: "white", border: "none", borderRadius: 13, fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
                Create account
              </button>
            </form>
            <button onClick={onClose} style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none", cursor: "pointer", color: "#A89F91" }}><X size={20} /></button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "13px 16px", borderRadius: 12, border: "1px solid #D4C9B8", fontSize: 15, outline: "none", background: "#FCFBF7",
}
