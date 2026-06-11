"use client"

import { useEffect, useState } from "react"
import { ProductCard } from "@/components/shared/ProductCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useProductStore } from "@/store/product-store"

interface ProductGridProps {
  category?: string
}

export function ProductGrid({ category }: ProductGridProps) {
  const products = useProductStore((state) => state.products)
  const loadProducts = useProductStore((state) => state.loadProducts)
  const [doneFirstLoad, setDoneFirstLoad] = useState(false)

  useEffect(() => {
    loadProducts().finally(() => setDoneFirstLoad(true))
  }, [loadProducts])

  const filteredProducts = category && category !== "All"
    ? products.filter((p) => p.category === category)
    : products

  if (products.length === 0 && !doneFirstLoad) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4">
            <Skeleton className="h-48 w-full rounded-lg mb-4" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (filteredProducts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: '#A89F91' }}>
        <p style={{ fontSize: '18px', marginBottom: '8px' }}>Our products will be displayed here</p>
        <p style={{ fontSize: '14px' }}>Check back soon for new arrivals.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredProducts.map((product) => (
        <ProductCard key={product.id} product={{
          id: product.id,
          name: product.name,
          slug: product.name.toLowerCase().replace(/\s+/g, "-"),
          description: product.description,
          price: product.retailPrice,
          compareAtPrice: product.isOnOffer ? product.offerPrice : null,
          images: product.images,
          category: product.category,
          inventory: product.stock,
          isFeatured: product.isFeatured || false,
          wholesalePrice: product.wholesalePrice,
          distributorPrice: product.distributorPrice,
        }} />
      ))}
    </div>
  )
}
