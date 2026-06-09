"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/Header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TreePine, ShoppingCart, Sparkles } from "lucide-react"
import Link from "next/link"
import { useCartStore } from "@/store/cart-store"

export default function NewArrivalsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)
  const addItem = useCartStore((state) => state.addItem)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('beeyond-trees-products')
    if (stored) {
      const all = JSON.parse(stored)
      setProducts(all.slice(-6).reverse())
    }
  }, [])

  if (!mounted) return null

  return (
    <div style={{ backgroundColor: '#F5F1E8', minHeight: '100vh' }}>
      <Header />
      
      <section style={{ backgroundColor: '#6B7D5C', color: 'white', padding: '60px 24px', textAlign: 'center' }}>
        <Sparkles size={40} style={{ marginBottom: '16px' }} />
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 'bold', marginBottom: '8px' }}>New Arrivals</h1>
        <p style={{ fontSize: '16px', opacity: 0.9 }}>Be the first to discover our latest products</p>
      </section>

      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 16px' }}>
        {products.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {products.map(product => (
              <Card key={product.id} style={{ borderColor: '#A89F91', overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
                <Link href={`/products/${product.name.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div style={{ height: '200px', backgroundColor: '#F5F1E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '16px' }} />
                    ) : (
                      <TreePine size={48} style={{ color: '#6B7D5C', opacity: 0.3 }} />
                    )}
                  </div>
                </Link>
                <CardContent style={{ padding: '16px' }}>
                  <Badge style={{ backgroundColor: '#8C6A4A', color: 'white', border: 'none', marginBottom: '8px', fontSize: '11px' }}>
                    <Sparkles size={12} style={{ marginRight: '4px' }} /> New
                  </Badge>
                  <Link href={`/products/${product.name.toLowerCase().replace(/\s+/g, "-")}`} style={{ textDecoration: 'none' }}>
                    <h3 style={{ fontWeight: '600', color: '#4A3F2F', marginBottom: '4px', fontSize: '16px' }}>{product.name}</h3>
                  </Link>
                  <p style={{ color: '#A89F91', fontSize: '13px', marginBottom: '8px', lineClamp: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {product.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#4A3F2F', fontSize: '18px' }}>KSh {product.retailPrice?.toLocaleString()}</span>
                    <Button size="sm" style={{ backgroundColor: '#6B7D5C', color: 'white' }}
                      onClick={() => addItem({
                        id: `${product.id}-retail`,
                        name: product.name,
                        price: product.retailPrice,
                        image: product.images?.[0] || "",
                        pricingTier: "retail",
                        maxQuantity: product.stock,
                        minQuantity: 1,
                      })}
                    >
                      <ShoppingCart size={14} style={{ marginRight: '6px' }} /> Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '64px', color: '#A89F91' }}>
            <TreePine size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <p style={{ fontSize: '16px' }}>Our products will be displayed here</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Check back soon for new arrivals.</p>
          </div>
        )}
      </section>
    </div>
  )
}
