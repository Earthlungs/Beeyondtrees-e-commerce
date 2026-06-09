"use client"

import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Search, SlidersHorizontal, X } from "lucide-react"

const categories = ["All", "Furniture", "Home & Living", "Pottery", "Ornamental & Curios"]
const priceRanges = [
  { label: "Under KSh 500", min: 0, max: 500 },
  { label: "KSh 500 - KSh 2,000", min: 500, max: 2000 },
  { label: "KSh 2,000 - KSh 5,000", min: 2000, max: 5000 },
  { label: "KSh 5,000 - KSh 15,000", min: 5000, max: 15000 },
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

export function ProductFilters({ selectedCategory, onCategoryChange, selectedPrice, onPriceChange, searchTerm, onSearchChange }: ProductFiltersProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-[#4A3F2F] mb-3 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A89F91]" />
          <Input 
            placeholder="Search products..." 
            className="pl-10 border-[#A89F91] focus:border-[#6B7D5C]" 
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => onSearchChange('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#A89F91' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <Separator className="bg-[#A89F91]" />

      <div>
        <h4 className="font-medium text-[#4A3F2F] mb-2">Category</h4>
        <div className="space-y-1">
          {categories.map((cat) => (
            <button 
              key={cat} 
              onClick={() => onCategoryChange(cat)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategory === cat 
                  ? "bg-[#6B7D5C] text-white" 
                  : "text-[#A89F91] hover:bg-[#E6D3A3] hover:text-[#4A3F2F]"
              }`}
            >
              {cat}
              {selectedCategory === cat && cat !== "All" && (
                <span style={{ float: 'right', fontSize: '11px', opacity: 0.7 }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <Separator className="bg-[#A89F91]" />

      <div>
        <h4 className="font-medium text-[#4A3F2F] mb-2">Price Range</h4>
        <div className="space-y-1">
          {priceRanges.map((range) => (
            <label 
              key={range.label}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                selectedPrice === range.label 
                  ? "bg-[#6B7D5C] text-white" 
                  : "text-[#A89F91] hover:bg-[#E6D3A3] hover:text-[#4A3F2F]"
              }`}
            >
              <input 
                type="radio" 
                name="price" 
                className="hidden" 
                checked={selectedPrice === range.label} 
                onChange={() => onPriceChange(selectedPrice === range.label ? null : range.label)} 
              />
              {range.label}
            </label>
          ))}
        </div>
        {selectedPrice && (
          <button 
            onClick={() => onPriceChange(null)}
            style={{ marginTop: '8px', fontSize: '12px', color: '#8C6A4A', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Clear price filter
          </button>
        )}
      </div>
    </div>
  )
}
