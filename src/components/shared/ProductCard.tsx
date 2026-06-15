"use client"

import { motion } from "motion/react"
import Link from "next/link"
import { ShoppingBag, TreePine, Heart } from "lucide-react"
import { Product, slugify, productImageUrl, effectivePrice, regularPrice, discountPercent } from "@/store/product-store"
import { useCartStore } from "@/store/cart-store"
import { useWishlistStore } from "@/store/wishlist-store"

const SAGE = "#6B7D5C"
const DARK = "#4A3F2F"

// Premium catalog card, image lazy-loads from the per-product image endpoint,
// retail quick-add; full pricing tiers live on the detail page.
export function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem)
  const wished = useWishlistStore((s) => s.ids.includes(product.id))
  const toggleWish = useWishlistStore((s) => s.toggle)
  const slug = slugify(product.name)
  const out = product.stock === 0
  const retail = effectivePrice(product, "retail")
  const onOffer = product.isOnOffer && retail < regularPrice(product, "retail")
  const pct = discountPercent(product, "retail")

  const add = () =>
    addItem({
      id: `${product.id}-retail`,
      name: product.name,
      price: retail,
      image: productImageUrl(product, 0, 200),
      pricingTier: "retail",
      maxQuantity: product.stock,
      minQuantity: 1,
    })

  return (
    <div className="byt-card" style={{ position: "relative", borderRadius: 18, overflow: "hidden", backgroundColor: "white", border: "1px solid #E7E1D4", height: "100%", display: "flex", flexDirection: "column" }}>
      <Link href={`/products/${slug}`} style={{ textDecoration: "none", display: "block" }}>
        <div style={{ position: "relative", aspectRatio: "1", backgroundColor: "#F3EFE6", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <TreePine size={42} style={{ color: SAGE, opacity: 0.22, position: "absolute" }} />
          <img
            className="byt-zoom"
            src={productImageUrl(product, 0, 500)}
            alt={product.name}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none" }}
            style={{ width: "100%", height: "100%", objectFit: "cover", position: "relative" }}
          />
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {out ? (
              <span style={{ background: "rgba(140,106,74,0.95)", color: "white", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999 }}>Sold out</span>
            ) : product.stock <= 5 ? (
              <span style={{ background: "rgba(230,168,23,0.95)", color: "white", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999 }}>Only {product.stock} left</span>
            ) : null}
            {product.isOnOffer && (
              <span className="byt-blink" style={{ background: "#C2452D", color: "white", fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", padding: "5px 10px", borderRadius: 999, alignSelf: "flex-start", boxShadow: "0 2px 8px rgba(194,69,45,0.45)" }}>{pct > 0 ? `${pct}% OFF` : "★ OFFER"}</span>
            )}
          </div>
        </div>
      </Link>
      <motion.button whileTap={{ scale: 0.8 }} aria-label="Add to wishlist"
        onClick={(e) => { e.preventDefault(); toggleWish(product.id) }}
        style={{ position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", zIndex: 3 }}>
        <Heart size={17} style={{ color: wished ? "#C2452D" : "#A89F91", fill: wished ? "#C2452D" : "transparent", transition: "all 0.2s" }} />
      </motion.button>

      <div style={{ padding: "16px 16px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 10.5, color: "#A89F91", fontWeight: 600, marginBottom: 6 }}>{product.category}</p>
        <Link href={`/products/${slug}`} style={{ textDecoration: "none" }}>
          <h3 style={{ fontWeight: 600, color: DARK, fontSize: 15.5, lineHeight: 1.3, margin: "0 0 12px", minHeight: 40 }}>{product.name}</h3>
        </Link>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <span className="font-display" style={{ fontSize: 19, fontWeight: 600, color: onOffer ? "#C2452D" : DARK }}>KSh {retail.toLocaleString()}</span>
            {onOffer && <span style={{ fontSize: 12, color: "#A89F91", textDecoration: "line-through", marginLeft: 6 }}>KSh {regularPrice(product, "retail").toLocaleString()}</span>}
            <span style={{ display: "block", fontSize: 11, color: "#A89F91" }}>retail · tiers inside</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            disabled={out}
            onClick={add}
            aria-label="Add to cart"
            style={{ width: 42, height: 42, borderRadius: 12, border: "none", backgroundColor: out ? "#E7E1D4" : SAGE, color: "white", cursor: out ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <ShoppingBag size={18} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
