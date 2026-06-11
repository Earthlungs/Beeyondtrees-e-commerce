"use client"

import { ProductCard } from "@/components/shared/ProductCard"
import { RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { Skeleton } from "@/components/ui/skeleton"
import { TreePine } from "lucide-react"
import type { Product } from "@/store/product-store"

interface ProductGridProps {
  products: Product[]
  showSkeleton: boolean
}

export function ProductGrid({ products, showSkeleton }: ProductGridProps) {
  if (showSkeleton) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden bg-white border border-[#E7E1D4]">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="p-4">
              <Skeleton className="h-3 w-1/3 mb-3" />
              <Skeleton className="h-4 w-4/5 mb-3" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px", color: "#A89F91" }}>
        <TreePine size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
        <p style={{ fontSize: 18, marginBottom: 6, color: "#4A3F2F", fontWeight: 500 }}>No products match your filters</p>
        <p style={{ fontSize: 14 }}>Try a different category or price range.</p>
      </div>
    )
  }

  return (
    <RevealGroup className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" stagger={0.05}>
      {products.map((product) => (
        <RevealItem key={product.id}>
          <ProductCard product={product} />
        </RevealItem>
      ))}
    </RevealGroup>
  )
}
