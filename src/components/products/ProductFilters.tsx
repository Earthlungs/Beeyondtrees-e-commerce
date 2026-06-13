"use client"

import { Search, X } from "lucide-react"

export const categories = ["All", "Furniture", "Home & Living", "Pottery", "Ornamental & Curios"]

export const priceRanges = [
  { label: "Under KSh 500", min: 0, max: 500 },
  { label: "KSh 500 – 2,000", min: 500, max: 2000 },
  { label: "KSh 2,000 – 5,000", min: 2000, max: 5000 },
  { label: "KSh 5,000 – 15,000", min: 5000, max: 15000 },
  { label: "Above KSh 15,000", min: 15000, max: Infinity },
]

interface ProductFiltersProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  selectedPrice: string | null
  onPriceChange: (price: string | null) => void
  searchTerm: string
  onSearchChange: (term: string) => void
}

const SAGE = "#6B7D5C"
const DARK = "#4A3F2F"

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ textTransform: "uppercase", letterSpacing: "0.16em", fontSize: 11, fontWeight: 700, color: "#A89F91", marginBottom: 12 }}>{children}</p>
  )
}

export function ProductFilters({ selectedCategory, onCategoryChange, selectedPrice, onPriceChange, searchTerm, onSearchChange }: ProductFiltersProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Search */}
      <div>
        <Heading>Search</Heading>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#A89F91" }} />
          <input
            placeholder="Search products…"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ width: "100%", padding: "10px 32px 10px 38px", borderRadius: 12, border: "1px solid #D4C9B8", background: "white", fontSize: 14, color: DARK, outline: "none" }}
          />
          {searchTerm && (
            <button onClick={() => onSearchChange("")} aria-label="Clear search" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#A89F91" }}>
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Category */}
      <div>
        <Heading>Category</Heading>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {categories.map((cat) => {
            const active = selectedCategory === cat
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                style={{
                  textAlign: "left", padding: "9px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  backgroundColor: active ? SAGE : "transparent",
                  color: active ? "white" : "#6b6353",
                  transition: "background-color 0.18s, color 0.18s",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "#EFE9DC" }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent" }}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Price */}
      <div>
        <Heading>Price</Heading>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {priceRanges.map((range) => {
            const active = selectedPrice === range.label
            return (
              <button
                key={range.label}
                onClick={() => onPriceChange(active ? null : range.label)}
                style={{
                  textAlign: "left", padding: "9px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  backgroundColor: active ? SAGE : "transparent",
                  color: active ? "white" : "#6b6353",
                  display: "flex", alignItems: "center", gap: 10,
                  transition: "background-color 0.18s, color 0.18s",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "#EFE9DC" }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent" }}
              >
                <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${active ? "white" : "#C2B7A3"}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />}
                </span>
                {range.label}
              </button>
            )
          })}
        </div>
        {selectedPrice && (
          <button onClick={() => onPriceChange(null)} style={{ marginTop: 10, fontSize: 12.5, color: "#8C6A4A", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
            Clear price filter
          </button>
        )}
      </div>
    </div>
  )
}
