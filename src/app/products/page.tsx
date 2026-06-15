"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { ChevronLeft } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { ScrollProgress } from "@/components/motion/ScrollProgress"
import { ProductGrid } from "@/components/products/ProductGrid"
import { PaginatedGrid } from "@/components/products/PaginatedGrid"
import { ProductFilters, priceRanges } from "@/components/products/ProductFilters"
import { useProductStore, fuzzyMatch } from "@/store/product-store"
import { SlidersHorizontal, X, ChevronDown, Search } from "lucide-react"

const DARK = "#4A3F2F"
const SAGE = "#6B7D5C"

type Sort = "featured" | "price-asc" | "price-desc"

function ProductsContent() {
  const searchParams = useSearchParams()
  const urlCategory = searchParams.get("category") || "All"

  const products = useProductStore((s) => s.products)
  const loadProducts = useProductStore((s) => s.loadProducts)
  const [doneFirstLoad, setDoneFirstLoad] = useState(false)

  const [selectedCategory, setSelectedCategory] = useState(urlCategory)
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sort, setSort] = useState<Sort>("featured")
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadProducts().finally(() => setDoneFirstLoad(true))
  }, [loadProducts])

  useEffect(() => {
    if (urlCategory !== selectedCategory) setSelectedCategory(urlCategory)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCategory])

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setShowFilters(false)
    // Apply instantly (filtering is client-side); just keep the URL shareable
    // without a navigation/reload.
    const url = category === "All" ? "/products" : `/products?category=${encodeURIComponent(category)}`
    window.history.replaceState(null, "", url)
  }

  const filtered = useMemo(() => {
    const range = priceRanges.find((r) => r.label === selectedPrice)
    const q = searchTerm.trim().toLowerCase()
    let list = products.filter((p) => {
      if (selectedCategory !== "All" && p.category !== selectedCategory) return false
      if (range && (p.retailPrice < range.min || p.retailPrice > range.max)) return false
      if (q && !fuzzyMatch(q, `${p.name} ${p.category} ${p.description}`)) return false
      return true
    })
    if (sort === "price-asc") list = [...list].sort((a, b) => a.retailPrice - b.retailPrice)
    if (sort === "price-desc") list = [...list].sort((a, b) => b.retailPrice - a.retailPrice)
    return list
  }, [products, selectedCategory, selectedPrice, searchTerm, sort])

  const showSkeleton = products.length === 0 && !doneFirstLoad

  // Pagination
  const PAGE_SIZE = 12
  const [page, setPage] = useState(1)
  const [direction, setDirection] = useState(0)
  useEffect(() => { setPage(1) }, [selectedCategory, selectedPrice, searchTerm, sort])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const goTo = (n: number) => {
    const next = Math.min(Math.max(1, n), totalPages)
    if (next === page) return
    setDirection(next > page ? 1 : -1) // drives the transition's sweep direction
    setPage(next)
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div style={{ backgroundColor: "#F5F1E8", minHeight: "100vh" }}>
      <ScrollProgress />
      <Header />

      {/* Page header band */}
      <section style={{ background: "linear-gradient(180deg, #EFE9DC, #F5F1E8)", borderBottom: "1px solid #E2DAC9" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 20px 36px" }}>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            style={{ textTransform: "uppercase", letterSpacing: "0.28em", fontSize: 12, fontWeight: 600, color: SAGE, marginBottom: 12 }}>
            {selectedCategory !== "All" ? selectedCategory : "The Collection"}
          </motion.p>
          <motion.h1 className="font-display" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }}
            style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 600, color: DARK, lineHeight: 1.05, margin: 0 }}>
            {selectedCategory !== "All" ? selectedCategory : "Natural goods, grown with purpose"}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.15 }}
            style={{ color: "#8a8170", fontSize: 16, marginTop: 14 }}>
            Every purchase grows a forest and a livelihood.
          </motion.p>
        </div>
      </section>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 20px 72px" }}>
        {/* Prominent search (always visible, fuzzy) */}
        <div style={{ position: "relative", marginBottom: 20, maxWidth: 560 }}>
          <Search size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#A89F91" }} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            style={{ width: "100%", height: 48, borderRadius: 999, border: "1px solid #D4C9B8", background: "white", padding: "0 44px", fontSize: 15, color: DARK, outline: "none" }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} aria-label="Clear search"
              style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#A89F91", display: "flex" }}>
              <X size={17} />
            </button>
          )}
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <p style={{ color: "#8a8170", fontSize: 14 }}>
            {showSkeleton ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "product" : "products"}`}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
                style={{ appearance: "none", padding: "9px 34px 9px 14px", borderRadius: 999, border: "1px solid #D4C9B8", background: "white", fontSize: 13.5, color: DARK, cursor: "pointer", fontWeight: 500 }}>
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
              </select>
              <ChevronDown size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#A89F91" }} />
            </div>
            <button onClick={() => setShowFilters((s) => !s)} className="lg:hidden"
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 999, border: `1px solid ${SAGE}`, background: "white", color: SAGE, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
              {showFilters ? <X size={15} /> : <SlidersHorizontal size={15} />} Filters
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block" style={{ width: 230, flexShrink: 0, position: "sticky", top: 80 }}>
            <ProductFilters
              selectedCategory={selectedCategory} onCategoryChange={handleCategoryChange}
              selectedPrice={selectedPrice} onPriceChange={setSelectedPrice}
              searchTerm={searchTerm} onSearchChange={setSearchTerm}
            />
          </aside>

          <div style={{ flex: 1, minWidth: 0 }}>
            {showSkeleton || pageItems.length === 0 ? (
              <ProductGrid products={pageItems} showSkeleton={showSkeleton} />
            ) : (
              <PaginatedGrid products={pageItems} page={page} direction={direction} />
            )}

            {!showSkeleton && totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 44, flexWrap: "wrap" }}>
                <PageBtn onClick={() => goTo(page - 1)} disabled={page === 1} arrow="left" />
                {Array.from({ length: totalPages }).map((_, i) => {
                  const n = i + 1
                  // condense: show first, last, current ±1
                  if (totalPages > 7 && n !== 1 && n !== totalPages && Math.abs(n - page) > 1) {
                    if (n === 2 || n === totalPages - 1) return <span key={n} style={{ color: "#A89F91", padding: "0 4px" }}>…</span>
                    return null
                  }
                  const active = n === page
                  return (
                    <button key={n} onClick={() => goTo(n)}
                      style={{ minWidth: 40, height: 40, borderRadius: 11, border: active ? "none" : "1px solid #D4C9B8", background: active ? SAGE : "white", color: active ? "white" : DARK, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                      {n}
                    </button>
                  )
                })}
                <PageBtn onClick={() => goTo(page + 1)} disabled={page === totalPages} arrow="right" />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)} className="lg:hidden"
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 60 }} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="lg:hidden"
              style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "82%", maxWidth: 340, background: "#F5F1E8", zIndex: 70, padding: "24px 22px", overflowY: "auto", boxShadow: "-20px 0 50px rgba(0,0,0,0.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                <span className="font-display" style={{ fontSize: 22, fontWeight: 600, color: DARK }}>Filters</span>
                <button onClick={() => setShowFilters(false)} style={{ background: "none", border: "none", cursor: "pointer", color: DARK }}><X size={22} /></button>
              </div>
              <ProductFilters
                selectedCategory={selectedCategory} onCategoryChange={handleCategoryChange}
                selectedPrice={selectedPrice} onPriceChange={setSelectedPrice}
                searchTerm={searchTerm} onSearchChange={setSearchTerm}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function PageBtn({ onClick, disabled, arrow }: { onClick: () => void; disabled: boolean; arrow: "left" | "right" }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={arrow === "left" ? "Previous page" : "Next page"}
      style={{ width: 40, height: 40, borderRadius: 11, border: "1px solid #D4C9B8", background: "white", color: disabled ? "#C2B7A3" : "#4A3F2F", cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: disabled ? 0.5 : 1 }}>
      <ChevronLeft size={18} style={{ transform: arrow === "right" ? "scaleX(-1)" : "none" }} />
    </button>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#F5F1E8" }} />}>
      <ProductsContent />
    </Suspense>
  )
}
