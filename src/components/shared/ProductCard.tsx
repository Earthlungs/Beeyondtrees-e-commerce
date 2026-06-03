"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Leaf } from "lucide-react"
import Link from "next/link"
import { useCartStore } from "@/store/cart-store"

interface Product {
  id: string; name: string; slug: string; description: string
  price: number; compareAtPrice: number | null; images: string[]
  category: string; inventory: number; isFeatured: boolean
  wholesalePrice?: number; distributorPrice?: number
}

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem)
  const [selectedTier, setSelectedTier] = useState<"retail" | "wholesale" | "distributor">("retail")
  
  const prices = {
    retail: product.price,
    wholesale: product.wholesalePrice || product.price,
    distributor: product.distributorPrice || product.price,
  }
  
  const currentPrice = prices[selectedTier]
  const hasImages = product.images && product.images.length > 0

  const handleAddToCart = () => {
    addItem({
      id: `${product.id}-${selectedTier}`,
      name: product.name,
      price: currentPrice,
      image: product.images?.[0] || "",
      pricingTier: selectedTier,
      maxQuantity: product.inventory,
    })
  }

  return (
    <Card className="group overflow-hidden border-[#A89F91] hover:border-[#6B7D5C] hover:shadow-lg transition-all duration-300">
      <Link href={`/products/${product.slug}`}>
        <div className="relative h-48 bg-gradient-to-br from-[#E6D3A3] to-[#6B7D5C] flex items-center justify-center overflow-hidden">
          {hasImages ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <Leaf className="h-16 w-16 text-white/50 group-hover:scale-125 transition-transform duration-500" />
          )}
          {product.inventory <= 5 && product.inventory > 0 && (
            <Badge className="absolute top-2 left-2 bg-[#E6A817] text-white border-0 text-xs">Only {product.inventory} left</Badge>
          )}
          {product.inventory === 0 && (
            <Badge className="absolute top-2 left-2 bg-[#8C6A4A] text-white border-0 text-xs">Out of Stock</Badge>
          )}
        </div>
      </Link>
      <CardContent className="p-3">
        <span className="text-xs font-medium text-[#6B7D5C] uppercase tracking-wider">{product.category}</span>
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-semibold text-[#4A3F2F] text-sm mb-1 hover:text-[#6B7D5C] transition-colors line-clamp-2">{product.name}</h3>
        </Link>

        {/* Pricing Tiers */}
        <div className="flex gap-1 mb-2 mt-1">
          {(["retail", "wholesale", "distributor"] as const).map((tier) => (
            <button
              key={tier}
              onClick={(e) => { e.preventDefault(); setSelectedTier(tier); }}
              className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                selectedTier === tier
                  ? 'bg-[#6B7D5C] text-white'
                  : 'bg-[#F5F1E8] text-[#A89F91] hover:bg-[#E6D3A3]'
              }`}
            >
              {tier === 'retail' ? 'Retail' : tier === 'wholesale' ? 'Wholesale' : 'Dist.'}
            </button>
          ))}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold text-[#4A3F2F]">KSh {currentPrice.toLocaleString()}</span>
          <span className={`text-xs font-medium ${product.inventory > 10 ? 'text-[#6B7D5C]' : product.inventory > 0 ? 'text-[#E6A817]' : 'text-[#8C6A4A]'}`}>
            {product.inventory} in stock
          </span>
        </div>

        {/* Add to Cart */}
        <Button
          size="sm"
          className="w-full bg-[#6B7D5C] hover:bg-[#5A6B4D] text-white"
          disabled={product.inventory === 0}
          onClick={(e) => { e.preventDefault(); handleAddToCart(); }}
        >
          <ShoppingCart className="h-4 w-4 mr-1" /> Add to Cart - {selectedTier === 'retail' ? 'Retail' : selectedTier === 'wholesale' ? 'Wholesale' : 'Distributor'}
        </Button>
      </CardContent>
    </Card>
  )
}
