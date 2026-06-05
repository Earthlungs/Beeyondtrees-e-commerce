"use client"

import { useState } from "react"
import Link from "next/link"
import { ShoppingCart, Menu, X, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCartStore } from "@/store/cart-store"
import { CartSheet } from "@/components/cart/CartSheet"

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { getItemCount, setIsOpen } = useCartStore()
  const itemCount = getItemCount()

  return (
    <>
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <div style={{ width: '36px', height: '36px', backgroundColor: '#6B7D5C', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>B</div>
              <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#6B7D5C' }}>
                BEEyond<span style={{ color: '#4A3F2F' }}> Trees</span>
              </span>
            </Link>

            <nav style={{ display: 'none', gap: '24px', alignItems: 'center' }} className="md:flex">
              <Link href="/" style={{ fontSize: '14px', color: '#6B7D5C', textDecoration: 'none', fontWeight: '500' }}>Home</Link>
              <Link href="/about" style={{ fontSize: '14px', color: '#4B5563', textDecoration: 'none' }}>About Us</Link>
              <Link href="/where-we-work" style={{ fontSize: '14px', color: '#4B5563', textDecoration: 'none' }}>Where We Work</Link>
              <Link href="/contact" style={{ fontSize: '14px', color: '#4B5563', textDecoration: 'none' }}>Contact Us</Link>
              <Link href="/careers" style={{ fontSize: '14px', color: '#4B5563', textDecoration: 'none' }}>Careers</Link>
              <Link href="/products" style={{ fontSize: '14px', color: '#6B7D5C', textDecoration: 'none', fontWeight: '600' }}>EarthLungs</Link>
              <Link href="/new-arrivals" style={{ fontSize: '14px', color: '#6B7D5C', textDecoration: 'none', fontWeight: '600' }}>New Arrivals</Link>
              <Link href="/faqs" style={{ fontSize: '14px', color: '#4B5563', textDecoration: 'none' }}>FAQs</Link>
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => setSearchOpen(!searchOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4B5563', padding: '6px' }}>
                <Search size={18} />
              </button>
              <button onClick={() => setIsOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4B5563', padding: '6px', position: 'relative' }}>
                <ShoppingCart size={18} />
                {itemCount > 0 && (
                  <span style={{ position: 'absolute', top: -2, right: -2, backgroundColor: '#6B7D5C', color: 'white', fontSize: '10px', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{itemCount}</span>
                )}
              </button>
              <Link href="/admin/login">
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4B5563', padding: '6px' }}>
                  <User size={18} />
                </button>
              </Link>
              <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}>
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {searchOpen && (
          <div style={{ borderTop: '1px solid #E5E7EB', padding: '12px 16px', backgroundColor: '#F9FAFB' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', gap: '8px' }}>
              <Input placeholder="Search for products..." style={{ flex: 1 }} />
              <Button style={{ backgroundColor: '#6B7D5C', color: 'white' }}>Search</Button>
            </div>
          </div>
        )}

        {menuOpen && (
          <div className="md:hidden" style={{ borderTop: '1px solid #E5E7EB', padding: '12px 16px', backgroundColor: 'white' }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { label: 'Home', href: '/' },
                { label: 'About Us', href: '/about' },
                { label: 'Where We Work', href: '/where-we-work' },
                { label: 'Contact Us', href: '/contact' },
                { label: 'Careers', href: '/careers' },
                { label: 'EarthLungs', href: '/products' },
                { label: 'New Arrivals', href: '/new-arrivals' },
                { label: 'FAQs', href: '/faqs' },
              ].map(item => (
                <Link key={item.href} href={item.href} style={{ padding: '10px 0', fontSize: '15px', color: '#6B7D5C', textDecoration: 'none', borderBottom: '1px solid #F3F4F6' }} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>
      <CartSheet />
    </>
  )
}
