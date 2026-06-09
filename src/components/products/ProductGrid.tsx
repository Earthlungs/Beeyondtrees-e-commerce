"use client"

import { ProductCard } from "@/components/shared/ProductCard"

interface ProductGridProps {
  category?: string
}

export function ProductGrid({ category }: ProductGridProps) {
  let products: any[] = []
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('beeyond-trees-products')
      products = stored ? JSON.parse(stored) : []
    } catch {
      products = []
    }
  }

  // Filter by category if provided
  const filteredProducts = category && category !== "All" 
    ? products.filter((p: any) => p.category === category)
    : products

  if (filteredProducts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: '#A89F91' }}>
        <p style={{ fontSize: '18px', marginBottom: '8px' }}>
          {category ? `No products in ${category}` : 'No products yet'}
        </p>
        <p style={{ fontSize: '14px' }}>
          {category ? 'Try a different category.' : 'Products added in admin panel will appear here.'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredProducts.map((product: any) => (
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
