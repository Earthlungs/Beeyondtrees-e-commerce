"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ShoppingCart, Leaf, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Product } from "@/store/product-store"
import { useCartStore } from "@/store/cart-store"

const tierLimits: Record<string, { min: number; max: number; label: string }> = {
  retail: { min: 1, max: 11, label: 'Retail (1-11 units)' },
  wholesale: { min: 12, max: 36, label: 'Wholesale (12-36 units)' },
  distributor: { min: 37, max: Infinity, label: 'Distributor (37+ units)' },
}

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const [product, setProduct] = useState<Product | null>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedTier, setSelectedTier] = useState<"retail" | "wholesale" | "distributor">("retail")
  const [currentImage, setCurrentImage] = useState(0)
  const addItem = useCartStore((state) => state.addItem)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('beeyond-trees-products')
    if (stored) {
      const products: Product[] = JSON.parse(stored)
      const found = products.find(
        (p) => p.name.toLowerCase().replace(/\s+/g, "-") === slug
      )
      setProduct(found || null)
    }
  }, [slug])

  const nextImage = () => {
    if (!product?.images) return
    setCurrentImage((prev) => (prev + 1) % product.images.length)
  }

  const prevImage = () => {
    if (!product?.images) return
    setCurrentImage((prev) => (prev - 1 + product.images.length) % product.images.length)
  }

  if (!mounted) return null

  if (!product) {
    return (
      <div style={{ backgroundColor: '#F5F1E8', minHeight: '100vh' }}>
        <Header />
        <div style={{ padding: '64px 24px', textAlign: 'center' }}>
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

  const prices = { retail: product.retailPrice, wholesale: product.wholesalePrice, distributor: product.distributorPrice }
  const limit = tierLimits[selectedTier]
  const canPurchase = product.stock >= limit.min
  const images = product.images || []
  const hasMultipleImages = images.length > 1

  const handleAddToCart = () => {
    addItem({
      id: `${product.id}-${selectedTier}`,
      name: product.name,
      price: prices[selectedTier],
      image: images[0] || "",
      pricingTier: selectedTier,
      maxQuantity: Math.min(limit.max, product.stock),
      minQuantity: limit.min,
    })
  }

  return (
    <div style={{ backgroundColor: '#F5F1E8', minHeight: '100vh' }}>
      <Header />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        <Link href="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#6B7D5C', textDecoration: 'none', marginBottom: '24px', fontSize: '14px' }}>
          <ArrowLeft size={16} /> Back to Products
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }} className="max-[768px]:grid-cols-1">
          {/* Image Gallery */}
          <div>
            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #A89F91', backgroundColor: 'white', aspectRatio: '1' }}>
              {images.length > 0 ? (
                <img src={images[currentImage]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '20px', transition: 'opacity 0.3s' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #E6D3A3, #6B7D5C)' }}>
                  <Leaf size={64} style={{ color: 'white', opacity: 0.5 }} />
                </div>
              )}

              {/* Navigation Arrows */}
              {hasMultipleImages && (
                <>
                  <button onClick={prevImage} style={{
                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                    width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'white',
                    border: '1px solid #A89F91', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 2
                  }}>
                    <ChevronLeft size={20} style={{ color: '#4A3F2F' }} />
                  </button>
                  <button onClick={nextImage} style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'white',
                    border: '1px solid #A89F91', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 2
                  }}>
                    <ChevronRight size={20} style={{ color: '#4A3F2F' }} />
                  </button>

                  {/* Image Counter */}
                  <div style={{
                    position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 12px',
                    borderRadius: '20px', fontSize: '12px', fontWeight: '500'
                  }}>
                    {currentImage + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {hasMultipleImages && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                {images.map((img, i) => (
                  <div key={i} onClick={() => setCurrentImage(i)} style={{
                    width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden',
                    border: i === currentImage ? '2px solid #6B7D5C' : '1px solid #A89F91',
                    cursor: 'pointer', flexShrink: 0, opacity: i === currentImage ? 1 : 0.6,
                    transition: 'all 0.2s', backgroundColor: 'white'
                  }}>
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <Badge style={{ backgroundColor: '#E6D3A3', color: '#4A3F2F', border: 'none', marginBottom: '12px', fontSize: '12px' }}>{product.category}</Badge>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#4A3F2F', marginBottom: '8px' }}>{product.name}</h1>
            <p style={{ color: '#A89F91', marginBottom: '20px', lineHeight: 1.7, fontSize: '14px' }}>{product.description}</p>

            {/* Pricing Tiers */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {(["retail", "wholesale", "distributor"] as const).map((tier) => {
                const t = tierLimits[tier]
                const available = product.stock >= t.min
                return (
                  <button key={tier} onClick={() => { if (available) setSelectedTier(tier) }} disabled={!available}
                    style={{
                      padding: '10px 16px', borderRadius: '8px', border: selectedTier === tier && available ? '2px solid #6B7D5C' : '1px solid #A89F91',
                      backgroundColor: !available ? '#f5f5f5' : selectedTier === tier ? '#6B7D5C' : 'white',
                      color: !available ? '#ccc' : selectedTier === tier ? 'white' : '#4A3F2F',
                      cursor: available ? 'pointer' : 'not-allowed', fontWeight: '500', fontSize: '13px', opacity: available ? 1 : 0.5,
                    }}>{t.label}</button>
                )
              })}
            </div>

            <p style={{ fontSize: '13px', color: '#A89F91', marginBottom: '16px' }}>{limit.label}: {limit.min}-{limit.max === Infinity ? 'unlimited' : limit.max} units per order</p>

            <Card style={{ padding: '20px', marginBottom: '16px', borderColor: '#A89F91' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4A3F2F', marginBottom: '16px' }}>
                KSh {prices[selectedTier].toLocaleString()}<span style={{ fontSize: '14px', fontWeight: 'normal', color: '#A89F91' }}> /unit</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <div style={{ padding: '10px', backgroundColor: '#F5F1E8', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#A89F91' }}>Retail</div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#4A3F2F' }}>KSh {product.retailPrice.toLocaleString()}</div>
                  <div style={{ fontSize: '10px', color: '#A89F91' }}>1-11 units</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#F5F1E8', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#A89F91' }}>Wholesale</div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#4A3F2F' }}>KSh {product.wholesalePrice.toLocaleString()}</div>
                  <div style={{ fontSize: '10px', color: '#A89F91' }}>12-36 units</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#F5F1E8', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#A89F91' }}>Distributor</div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#4A3F2F' }}>KSh {product.distributorPrice.toLocaleString()}</div>
                  <div style={{ fontSize: '10px', color: '#A89F91' }}>37+ units</div>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                {product.stock > 0 ? (
                  <span style={{ color: product.stock <= 5 ? '#E6A817' : '#6B7D5C', fontSize: '14px', fontWeight: '500' }}>
                    {product.stock <= 5 ? `Only ${product.stock} left in stock` : `${product.stock} in stock`}
                  </span>
                ) : (
                  <span style={{ color: '#8C6A4A', fontSize: '14px', fontWeight: '500' }}>Out of Stock</span>
                )}
              </div>
              <Button 
                style={{ width: '100%', backgroundColor: '#6B7D5C', color: 'white', height: '48px', fontSize: '16px' }}
                disabled={!canPurchase}
                onClick={handleAddToCart}
              >
                <ShoppingCart size={18} style={{ marginRight: '8px' }} />
                {!canPurchase ? `Need ${limit.min}+ units in stock` : 'Add to Cart'}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
