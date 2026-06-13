"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/Header"
import { ScrollProgress } from "@/components/motion/ScrollProgress"
import { ProductCard } from "@/components/shared/ProductCard"
import { RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { useProductStore } from "@/store/product-store"
import { useWishlistStore } from "@/store/wishlist-store"
import { Heart, ArrowRight } from "lucide-react"

const SAGE = "#6B7D5C"
const DARK = "#4A3F2F"

export default function WishlistPage() {
  const products = useProductStore((s) => s.products)
  const loadProducts = useProductStore((s) => s.loadProducts)
  const ids = useWishlistStore((s) => s.ids)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadProducts()
  }, [loadProducts])

  const items = products.filter((p) => ids.includes(p.id))

  return (
    <div style={{ backgroundColor: "#F5F1E8", minHeight: "100vh" }}>
      <ScrollProgress />
      <Header />
      <section style={{ background: "linear-gradient(180deg, #EFE9DC, #F5F1E8)", borderBottom: "1px solid #E2DAC9" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 20px 36px" }}>
          <p style={{ textTransform: "uppercase", letterSpacing: "0.28em", fontSize: 12, fontWeight: 600, color: SAGE, marginBottom: 12 }}>Saved for later</p>
          <h1 className="font-display" style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 600, color: DARK, margin: 0 }}>Your Wishlist</h1>
        </div>
      </section>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 20px 80px" }}>
        {!mounted ? null : items.length > 0 ? (
          <RevealGroup className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" stagger={0.05}>
            {items.map((p) => (
              <RevealItem key={p.id}><ProductCard product={p} /></RevealItem>
            ))}
          </RevealGroup>
        ) : (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <div style={{ width: 78, height: 78, borderRadius: "50%", background: "#EFE9DC", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px" }}>
              <Heart size={34} style={{ color: SAGE }} />
            </div>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, color: DARK, marginBottom: 8 }}>Nothing saved yet</h2>
            <p style={{ color: "#8a8170", marginBottom: 26 }}>Tap the heart on any product to keep it here.</p>
            <Link href="/products" style={{ textDecoration: "none" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 9, background: SAGE, color: "white", padding: "13px 26px", borderRadius: 999, fontWeight: 600 }}>
                Browse the collection <ArrowRight size={18} />
              </span>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
