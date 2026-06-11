"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { Header } from "@/components/layout/Header"
import { ScrollProgress } from "@/components/motion/ScrollProgress"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { ProductCard } from "@/components/shared/ProductCard"
import { ShoppingCart, Leaf, ArrowLeft, ChevronLeft, ChevronRight, Truck, Sprout, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useProductStore, slugify } from "@/store/product-store"
import { useCartStore } from "@/store/cart-store"

const SAGE = "#6B7D5C"
const DARK = "#4A3F2F"
const CREAM = "#F5F1E8"

const tierLimits: Record<string, { min: number; max: number; label: string; range: string }> = {
  retail: { min: 1, max: 11, label: "Retail", range: "1–11 units" },
  wholesale: { min: 12, max: 36, label: "Wholesale", range: "12–36 units" },
  distributor: { min: 37, max: Infinity, label: "Distributor", range: "37+ units" },
}

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params.slug as string

  const productsList = useProductStore((s) => s.products)
  const loadProducts = useProductStore((s) => s.loadProducts)
  const addItem = useCartStore((s) => s.addItem)

  const [ready, setReady] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [selectedTier, setSelectedTier] = useState<"retail" | "wholesale" | "distributor">("retail")
  const [currentImage, setCurrentImage] = useState(0)

  useEffect(() => {
    loadProducts().finally(() => setReady(true))
  }, [loadProducts])

  const product = productsList.find((p) => slugify(p.name) === slug) || null
  const productId = product?.id

  useEffect(() => {
    if (!productId) return
    let active = true
    fetch(`/api/products/${productId}`)
      .then((r) => r.json())
      .then((d) => { if (active) setImages(Array.isArray(d.images) ? d.images : []) })
      .catch(() => {})
    return () => { active = false }
  }, [productId])

  const related = useMemo(() => {
    if (!product) return []
    const sameCat = productsList.filter((p) => p.id !== product.id && p.category === product.category)
    const others = productsList.filter((p) => p.id !== product.id && p.category !== product.category)
    return [...sameCat, ...others].slice(0, 4)
  }, [productsList, product])

  if (!ready) {
    return (
      <div style={{ backgroundColor: CREAM, minHeight: "100vh" }}>
        <Header />
        <div style={{ padding: "100px 24px", textAlign: "center", color: "#A89F91" }}>Loading product…</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{ backgroundColor: CREAM, minHeight: "100vh" }}>
        <Header />
        <div style={{ padding: "100px 24px", textAlign: "center" }}>
          <Leaf size={42} style={{ color: SAGE, opacity: 0.4, margin: "0 auto 16px" }} />
          <h2 className="font-display" style={{ color: DARK, marginBottom: 16, fontSize: 26 }}>Product not found</h2>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "white", background: SAGE, padding: "12px 24px", borderRadius: 999, fontWeight: 600 }}>
              <ArrowLeft size={16} /> Back to Home
            </span>
          </Link>
        </div>
      </div>
    )
  }

  const prices = { retail: product.retailPrice, wholesale: product.wholesalePrice, distributor: product.distributorPrice }
  const limit = tierLimits[selectedTier]
  const canPurchase = product.stock >= limit.min
  const hasMultiple = images.length > 1
  const nextImage = () => images.length && setCurrentImage((p) => (p + 1) % images.length)
  const prevImage = () => images.length && setCurrentImage((p) => (p - 1 + images.length) % images.length)

  const handleAddToCart = () => {
    addItem({
      id: `${product.id}-${selectedTier}`,
      name: product.name,
      price: prices[selectedTier],
      image: `/api/products/${product.id}/image`,
      pricingTier: selectedTier,
      maxQuantity: Math.min(limit.max, product.stock),
      minQuantity: limit.min,
    })
  }

  return (
    <div style={{ backgroundColor: CREAM, minHeight: "100vh" }}>
      <ScrollProgress />
      <Header />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 20px" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <motion.span whileHover={{ x: -4 }} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: SAGE, fontSize: 14, fontWeight: 500 }}>
            <ArrowLeft size={16} /> Back to Home
          </motion.span>
        </Link>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "8px 20px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 48, alignItems: "start" }}>
          {/* Gallery */}
          <Reveal>
            <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", border: "1px solid #E2DAC9", backgroundColor: "white", aspectRatio: "1" }}>
              <AnimatePresence mode="wait">
                {images.length > 0 ? (
                  <motion.img
                    key={currentImage}
                    src={images[currentImage]}
                    alt={product.name}
                    initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div key="ph" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #E6D3A3, #6B7D5C)" }}>
                    <Leaf size={64} style={{ color: "white", opacity: 0.5 }} />
                  </div>
                )}
              </AnimatePresence>

              {hasMultiple && (
                <>
                  <button onClick={prevImage} aria-label="Previous" style={navBtn("left")}><ChevronLeft size={20} style={{ color: DARK }} /></button>
                  <button onClick={nextImage} aria-label="Next" style={navBtn("right")}><ChevronRight size={20} style={{ color: DARK }} /></button>
                  <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", color: "white", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500 }}>
                    {currentImage + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            {hasMultiple && (
              <div style={{ display: "flex", gap: 10, marginTop: 14, overflowX: "auto", paddingBottom: 4 }}>
                {images.map((img, i) => (
                  <button key={i} onClick={() => setCurrentImage(i)} style={{ width: 70, height: 70, borderRadius: 12, overflow: "hidden", border: i === currentImage ? `2px solid ${SAGE}` : "1px solid #D4C9B8", cursor: "pointer", flexShrink: 0, opacity: i === currentImage ? 1 : 0.65, background: "white", padding: 0 }}>
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}
          </Reveal>

          {/* Info / buy box */}
          <Reveal delay={0.1}>
            <div style={{ position: "sticky", top: 84 }}>
              <span style={{ display: "inline-block", background: "#EFE9DC", color: SAGE, fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>{product.category}</span>
              <h1 className="font-display" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 600, color: DARK, lineHeight: 1.1, margin: "0 0 14px" }}>{product.name}</h1>

              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
                <span className="font-display" style={{ fontSize: 34, fontWeight: 600, color: DARK }}>KSh {prices[selectedTier].toLocaleString()}</span>
                <span style={{ color: "#A89F91", fontSize: 14 }}>/ unit · {limit.label}</span>
              </div>

              <p style={{ color: "#6b6353", lineHeight: 1.75, fontSize: 15.5, marginBottom: 26 }}>{product.description}</p>

              {/* Tier selector */}
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#A89F91", marginBottom: 10 }}>Choose pricing tier</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 24 }}>
                {(["retail", "wholesale", "distributor"] as const).map((tier) => {
                  const t = tierLimits[tier]
                  const available = product.stock >= t.min
                  const active = selectedTier === tier
                  return (
                    <button key={tier} onClick={() => available && setSelectedTier(tier)} disabled={!available}
                      style={{
                        padding: "14px 8px", borderRadius: 14, cursor: available ? "pointer" : "not-allowed", textAlign: "center",
                        border: active ? `2px solid ${SAGE}` : "1px solid #D4C9B8",
                        background: active ? SAGE : "white", color: active ? "white" : !available ? "#C2B7A3" : DARK,
                        opacity: available ? 1 : 0.55, transition: "all 0.2s",
                      }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.label}</div>
                      <div style={{ fontSize: 11, opacity: 0.85, marginTop: 3 }}>{t.range}</div>
                      <div className="font-display" style={{ fontSize: 15, fontWeight: 600, marginTop: 6 }}>KSh {prices[tier].toLocaleString()}</div>
                    </button>
                  )
                })}
              </div>

              {/* Stock */}
              <div style={{ marginBottom: 18, fontSize: 14, fontWeight: 500 }}>
                {product.stock > 0 ? (
                  <span style={{ color: product.stock <= 5 ? "#E6A817" : SAGE, display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                    {product.stock <= 5 ? `Only ${product.stock} left in stock` : `In stock · ${product.stock} available`}
                  </span>
                ) : (
                  <span style={{ color: "#8C6A4A" }}>Currently out of stock</span>
                )}
              </div>

              <motion.button whileHover={canPurchase ? { scale: 1.02 } : {}} whileTap={canPurchase ? { scale: 0.98 } : {}}
                onClick={handleAddToCart} disabled={!canPurchase}
                style={{ width: "100%", height: 54, borderRadius: 14, border: "none", background: canPurchase ? SAGE : "#D4C9B8", color: "white", fontSize: 16, fontWeight: 600, cursor: canPurchase ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, boxShadow: canPurchase ? "0 14px 30px -12px rgba(107,125,92,0.7)" : "none" }}>
                <ShoppingCart size={19} /> {canPurchase ? `Add to cart · ${limit.label}` : `Needs ${limit.min}+ in stock`}
              </motion.button>

              {/* Trust row */}
              <div style={{ display: "flex", gap: 18, marginTop: 24, flexWrap: "wrap" }}>
                {[{ i: Sprout, t: "Plants trees" }, { i: ShieldCheck, t: "Naturally made" }, { i: Truck, t: "Kenya delivery" }].map((b) => (
                  <div key={b.t} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6b6353" }}>
                    <b.i size={17} style={{ color: SAGE }} /> {b.t}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 20px 80px" }}>
          <Reveal style={{ marginBottom: 28 }}>
            <p style={{ textTransform: "uppercase", letterSpacing: "0.28em", fontSize: 12, fontWeight: 600, color: SAGE, marginBottom: 10 }}>You may also like</p>
            <h2 className="font-display" style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 600, color: DARK, margin: 0 }}>More from the collection</h2>
          </Reveal>
          <RevealGroup className="grid grid-cols-2 lg:grid-cols-4 gap-5" stagger={0.06}>
            {related.map((p) => (
              <RevealItem key={p.id}><ProductCard product={p} /></RevealItem>
            ))}
          </RevealGroup>
        </section>
      )}
    </div>
  )
}

function navBtn(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute", [side]: 14, top: "50%", transform: "translateY(-50%)",
    width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.92)",
    border: "1px solid #E2DAC9", cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", boxShadow: "0 4px 14px rgba(0,0,0,0.12)", zIndex: 2,
  }
}
