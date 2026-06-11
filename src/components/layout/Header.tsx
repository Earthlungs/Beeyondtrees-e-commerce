"use client"

import { useState } from "react"
import Link from "next/link"
import { ShoppingCart, Menu, X, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCartStore } from "@/store/cart-store"
import { CartSheet } from "@/components/cart/CartSheet"
import { cn } from "@/lib/utils"

const navLinks = [
  { label: "Home", href: "/", highlight: true },
  { label: "About Us", href: "/about" },
  { label: "Where We Work", href: "/where-we-work" },
  { label: "Contact Us", href: "/contact" },
  { label: "Careers", href: "/careers" },
  { label: "EarthLungs", href: "/products", highlight: true },
  { label: "New Arrivals", href: "/new-arrivals", highlight: true },
  { label: "FAQs", href: "/faqs" },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { getItemCount, setIsOpen } = useCartStore()
  const itemCount = getItemCount()

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-[60px] items-center justify-between">
            <Link href="/" className="flex items-center gap-2 no-underline">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                B
              </div>
              <span className="text-lg font-bold text-primary">
                BEEyond<span className="text-foreground"> Trees</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-6 md:flex">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm no-underline transition-colors hover:text-primary",
                    item.highlight
                      ? "font-semibold text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Search"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>
              <button
                onClick={() => setIsOpen(true)}
                className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Cart"
              >
                <ShoppingCart className="h-[18px] w-[18px]" />
                {itemCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {itemCount}
                  </span>
                )}
              </button>
              <Link href="/portal">
                <button
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Staff portal"
                >
                  <User className="h-[18px] w-[18px]" />
                </button>
              </Link>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-md p-2 md:hidden"
                aria-label="Menu"
              >
                {menuOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
              </button>
            </div>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-border bg-muted/50 px-4 py-3">
            <div className="mx-auto flex max-w-xl gap-2">
              <Input placeholder="Search for products..." className="flex-1" />
              <Button>Search</Button>
            </div>
          </div>
        )}

        {menuOpen && (
          <div className="border-t border-border bg-card px-4 py-3 md:hidden">
            <nav className="flex flex-col">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-b border-border/50 py-2.5 text-[15px] text-primary no-underline last:border-0"
                  onClick={() => setMenuOpen(false)}
                >
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
