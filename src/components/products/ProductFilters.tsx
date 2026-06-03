"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Search, SlidersHorizontal } from "lucide-react"

const categories = ["All", "Furniture", "Home & Living", "Pottery", "Ornamental & Curios"]
const priceRanges = [
  { label: "Under KSh 500", min: 0, max: 500 },
  { label: "KSh 500 - KSh 2,000", min: 500, max: 2000 },
  { label: "KSh 2,000 - KSh 5,000", min: 2000, max: 5000 },
  { label: "KSh 5,000 - KSh 15,000", min: 5000, max: 15000 },
  { label: "Above KSh 15,000", min: 15000, max: Infinity },
]

export function ProductFilters() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-[#4A3F2F] mb-3 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A89F91]" />
          <Input placeholder="Search products..." className="pl-10 border-[#A89F91] focus:border-[#6B7D5C]" />
        </div>
      </div>
      <Separator className="bg-[#A89F91]" />
      <div>
        <h4 className="font-medium text-[#4A3F2F] mb-2">Category</h4>
        <div className="space-y-2">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategory === cat ? "bg-[#6B7D5C] text-white" : "text-[#A89F91] hover:bg-[#E6D3A3] hover:text-[#4A3F2F]"
              }`}
            >{cat}</button>
          ))}
        </div>
      </div>
      <Separator className="bg-[#A89F91]" />
      <div>
        <h4 className="font-medium text-[#4A3F2F] mb-2">Price Range</h4>
        <div className="space-y-2">
          {priceRanges.map((range) => (
            <label key={range.label}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                selectedPrice === range.label ? "bg-[#6B7D5C] text-white" : "text-[#A89F91] hover:bg-[#E6D3A3] hover:text-[#4A3F2F]"
              }`}
            >
              <input type="radio" name="price" className="hidden" checked={selectedPrice === range.label} onChange={() => setSelectedPrice(range.label)} />
              {range.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
