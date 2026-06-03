"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ShoppingCart, Leaf, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Product } from "@/store/product-store"

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const [product, setProduct] = useState<Product | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('beeyond-trees-products')
    if (stored) {
      const products: Product[] = JSON.parse(stored)
      const found = products.find(
        (p) => p.name.toLowerCase().replace(/\s+/g, "-") === slug
      )
      setProduct(found || null)
    }
  }, [slug])

  if (!product) {
    return (
      <div style={{ backgroundColor: '#F5F1E8', minHeight: '100vh' }}>
        <Header />
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
          <h2 style={{ color: '#4A3F2F', marginBottom: '16px' }}>Product not found</h2>
          <Link href="/products">
            <Button variant="outline" style={{ borderColor: '#6B7D5C', color: '#6B7D5C' }}>
              <ArrowLeft size={16} style={{ marginRight: '8px' }} /> Back to Products
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#F5F1E8', minHeight: '100vh' }}>
      <Header />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <Link href="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#6B7D5C', textDecoration: 'none', marginBottom: '24px', fontSize: '14px' }}>
          <ArrowLeft size={16} /> Back to Products
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
          {/* Images */}
          <div>
            {product.images && product.images.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #A89F91', aspectRatio: '1' }}>
                  <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                {product.images.length > 1 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {product.images.slice(1).map((img, i) => (
                      <div key={i} style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #A89F91', cursor: 'pointer' }}>
                        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ borderRadius: '12px', border: '1px solid #A89F91', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #E6D3A3, #6B7D5C)' }}>
                <Leaf size={64} style={{ color: 'white', opacity: 0.5 }} />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <Badge style={{ backgroundColor: '#E6D3A3', color: '#4A3F2F', border: 'none', marginBottom: '12px' }}>
              {product.category}
            </Badge>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#4A3F2F', marginBottom: '8px' }}>{product.name}</h1>
            <p style={{ color: '#A89F91', marginBottom: '24px', lineHeight: '1.6' }}>{product.description}</p>

            {/* Pricing */}
            <Card style={{ padding: '20px', marginBottom: '24px', borderColor: '#A89F91' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#4A3F2F' }}>KSh {product.retailPrice.toLocaleString()}</span>
                {product.isOnOffer && product.offerPrice && (
                  <span style={{ fontSize: '18px', color: '#A89F91', textDecoration: 'line-through' }}>KSh {product.offerPrice.toLocaleString()}</span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', backgroundColor: '#F5F1E8', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#A89F91' }}>Wholesale</div>
                  <div style={{ fontWeight: '600', color: '#4A3F2F' }}>KSh {product.wholesalePrice.toLocaleString()}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#F5F1E8', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#A89F91' }}>Distributor</div>
                  <div style={{ fontWeight: '600', color: '#4A3F2F' }}>KSh {product.distributorPrice.toLocaleString()}</div>
                </div>
              </div>

              {/* Stock */}
              <div style={{ marginBottom: '16px' }}>
                {product.stock > 0 ? (
                  <span style={{ color: product.stock <= 5 ? '#E6A817' : '#6B7D5C', fontSize: '14px', fontWeight: '500' }}>
                    {product.stock <= 5 ? `Only ${product.stock} left in stock` : `In Stock (${product.stock} available)`}
                  </span>
                ) : (
                  <span style={{ color: '#8C6A4A', fontSize: '14px', fontWeight: '500' }}>Out of Stock</span>
                )}
              </div>

              <Button 
                style={{ width: '100%', backgroundColor: '#6B7D5C', color: 'white', height: '48px', fontSize: '16px' }}
                disabled={product.stock === 0}
              >
                <ShoppingCart size={18} style={{ marginRight: '8px' }} /> Add to Cart
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
