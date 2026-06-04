"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, TreePine, Menu, X } from "lucide-react"
import { useState, useEffect } from "react"
import { useCartStore } from "@/store/cart-store"
import { CartSheet } from "@/components/cart/CartSheet"

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { getItemCount, setIsOpen } = useCartStore()
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const itemCount = mounted ? getItemCount() : 0

  return (
    <>
      <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50" style={{ borderColor: '#A89F91' }}>
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight" style={{ color: '#4A3F2F' }}>
            <TreePine className="h-6 w-6" style={{ color: '#6B7D5C' }} />
            <span className="hidden sm:inline">Beeyond<span style={{ color: '#6B7D5C' }}> Trees</span></span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/products" className="text-sm font-medium hover:text-[#6B7D5C] transition-colors" style={{ color: '#4A3F2F' }}>Shop All</Link>
            <Link href="/products?category=Furniture" className="text-sm font-medium hover:text-[#6B7D5C] transition-colors" style={{ color: '#4A3F2F' }}>Furniture</Link>
            <Link href="/products?category=Home+%26+Living" className="text-sm font-medium hover:text-[#6B7D5C] transition-colors" style={{ color: '#4A3F2F' }}>Home & Living</Link>
            <Link href="/products?category=Pottery" className="text-sm font-medium hover:text-[#6B7D5C] transition-colors" style={{ color: '#4A3F2F' }}>Pottery</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative hover:text-[#6B7D5C]" style={{ color: '#4A3F2F' }} onClick={() => setIsOpen(true)}>
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-[#8C6A4A] text-white border-0 text-xs">
                  {itemCount}
                </Badge>
              )}
            </Button>
            
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t" style={{ borderColor: '#A89F91', backgroundColor: 'white' }}>
            <nav className="flex flex-col p-4 gap-3">
              <Link href="/products" className="text-sm font-medium py-2" style={{ color: '#4A3F2F' }} onClick={() => setMenuOpen(false)}>Shop All</Link>
              <Link href="/products?category=Furniture" className="text-sm font-medium py-2" style={{ color: '#4A3F2F' }} onClick={() => setMenuOpen(false)}>Furniture</Link>
              <Link href="/products?category=Home+%26+Living" className="text-sm font-medium py-2" style={{ color: '#4A3F2F' }} onClick={() => setMenuOpen(false)}>Home & Living</Link>
              <Link href="/products?category=Pottery" className="text-sm font-medium py-2" style={{ color: '#4A3F2F' }} onClick={() => setMenuOpen(false)}>Pottery</Link>
              <Link href="/products?category=Ornamental+%26+Curios" className="text-sm font-medium py-2" style={{ color: '#4A3F2F' }} onClick={() => setMenuOpen(false)}>Ornamental & Curios</Link>
            </nav>
          </div>
        )}
      </header>
      <CartSheet />
    </>
  )
}
