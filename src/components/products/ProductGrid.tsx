"use client"

import { useState, useEffect } from "react"
import { ProductCard } from "@/components/shared/ProductCard"

export function ProductGrid() {
  const [products, setProducts] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem('beeyond-trees-products')
      if (stored) {
        setProducts(JSON.parse(stored))
      }
    } catch {}
  }, [])

  if (!mounted) {
    return null
  }

  if (products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: '#A89F91' }}>
        <p style={{ fontSize: '18px', marginBottom: '8px' }}>No products yet</p>
        <p style={{ fontSize: '14px' }}>Products added in admin panel will appear here.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product: any) => (
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
          isFeatured: false,
          wholesalePrice: product.wholesalePrice,
          distributorPrice: product.distributorPrice,
        }} />
      ))}
    </div>
  )
}
