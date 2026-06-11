"use client"

import { useState, useEffect } from "react"
import { useProductStore } from "@/store/product-store"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Search, ChevronLeft, ChevronRight, TreePine, Users, Globe, Leaf, Sprout, Mail, Phone, MapPin, Send, Lightbulb, TrendingUp } from "lucide-react"

export default function Home() {
  const [maxPrice, setMaxPrice] = useState(100000)
  const products = useProductStore((state) => state.products)
  const loadProducts = useProductStore((state) => state.loadProducts)
  const [doneFirstLoad, setDoneFirstLoad] = useState(false)

  useEffect(() => {
    loadProducts().finally(() => setDoneFirstLoad(true))
  }, [loadProducts])

  // Show skeletons while the first load is in flight (cached visits skip this).
  const showSkeleton = products.length === 0 && !doneFirstLoad

  return (
    <div style={{ backgroundColor: 'white' }}>
      <Header />

      <section style={{ background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.3)), url("https://images.unsplash.com/photo-1448375240586-882707db888b?w=1400") center/cover', color: 'white', padding: '100px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 'bold', marginBottom: '16px', lineHeight: 1.2 }}>BEEyond Trees</h1>
          <p style={{ fontSize: '18px', marginBottom: '32px', opacity: 0.9 }}>Sustaining Forest Adjacent Communities beyond tree planting and growing.</p>
          <Link href="/products"><Button size="lg" style={{ backgroundColor: '#6B7D5C', color: 'white', border: 'none', height: '48px', padding: '0 32px', fontSize: '16px', fontWeight: '600' }}>Shop Now</Button></Link>
        </div>
      </section>

      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <Input placeholder="Search for products..." style={{ paddingLeft: '40px' }} />
          </div>
          <Button style={{ backgroundColor: '#6B7D5C', color: 'white' }}>Search</Button>
        </div>
        <div>
          <p style={{ fontSize: '14px', fontWeight: '500', color: '#6B7D5C', marginBottom: '8px' }}>Filter by Budget</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>KSh 0</span>
            <input type="range" min="0" max="100000" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} style={{ flex: 1, accentColor: '#6B7D5C' }} />
            <span style={{ fontSize: '13px', color: '#6B7280' }}>KSh 100,000</span>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px 48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#6B7D5C', marginBottom: '24px' }}>Our Collection</h2>
        {showSkeleton ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                <Skeleton className="h-[180px] w-full rounded-none" />
                <CardContent style={{ padding: '14px' }}>
                  <Skeleton className="h-4 w-4/5 mb-2" />
                  <Skeleton className="h-5 w-1/2 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {products.map(product => (
              <Link key={product.id} href={`/products/${product.name.toLowerCase().replace(/\s+/g, "-")}`} style={{ textDecoration: 'none' }}>
                <Card style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ height: '180px', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <TreePine size={40} style={{ color: '#6B7D5C', opacity: 0.3, position: 'absolute' }} />
                    <img src={`/api/products/${product.id}/image`} alt={product.name} loading="lazy" onError={e => { e.currentTarget.style.display = 'none' }} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '16px', position: 'relative', backgroundColor: '#F3F4F6' }} />
                  </div>
                  <CardContent style={{ padding: '14px' }}>
                    <h3 style={{ fontWeight: '600', color: '#6B7D5C', fontSize: '15px' }}>{product.name}</h3>
                    <p style={{ fontWeight: 'bold', color: '#6B7D5C', fontSize: '16px' }}>KSh {product.retailPrice?.toLocaleString()}</p>
                    <p style={{ fontSize: '12px', color: '#6B7280' }}>{product.stock} units</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px', color: '#9CA3AF' }}>
            <TreePine size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>Our products will be displayed here</p>
            <p style={{ fontSize: '14px' }}>Check back soon for new arrivals.</p>
          </div>
        )}
      </section>

      <section style={{ backgroundColor: '#F9FAFB', padding: '64px 16px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#6B7D5C', marginBottom: '16px', textAlign: 'center' }}>About BEEyond Trees</h2>
          <p style={{ maxWidth: '800px', margin: '0 auto 32px', textAlign: 'center', color: '#4B5563', lineHeight: 1.7, fontSize: '15px' }}>
            BEEyond Trees is a flagship sustainability and community livelihood initiative developed by EarthLungs Reforestation Foundation in Kenya.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', textAlign: 'center' }}>
            {[{ icon: Sprout, label: 'Reforestation' }, { icon: Users, label: 'Community First' }, { icon: Globe, label: 'Sustainability' }].map((item, i) => (
              <div key={i} style={{ padding: '24px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <item.icon size={32} style={{ color: '#6B7D5C', margin: '0 auto 12px' }} />
                <p style={{ fontWeight: '600', color: '#6B7D5C', fontSize: '15px' }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ backgroundColor: '#6B7D5C', color: 'white', padding: '48px 16px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px', marginBottom: '32px', textAlign: 'left' }}>
            <div><h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>BEEyond Trees</h3><p style={{ fontSize: '14px', color: '#E6D3A3', lineHeight: 1.6 }}>Sustainable natural products from Kenya.</p></div>
            <div><h4 style={{ fontWeight: '600', marginBottom: '12px' }}>Quick Links</h4><div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}><Link href="/" style={{ color: '#E6D3A3', textDecoration: 'none' }}>Home</Link><Link href="/about" style={{ color: '#E6D3A3', textDecoration: 'none' }}>About</Link><Link href="/contact" style={{ color: '#E6D3A3', textDecoration: 'none' }}>Contact</Link></div></div>
            <div><h4 style={{ fontWeight: '600', marginBottom: '12px' }}>Contact</h4><div style={{ fontSize: '14px', color: '#E6D3A3' }}><p>Nairobi, Kenya</p><p>+254 718 681 684</p></div></div>
            <div><h4 style={{ fontWeight: '600', marginBottom: '12px' }}>Portal</h4><Link href="/portal" style={{ color: '#E6D3A3', textDecoration: 'none', fontSize: '14px' }}>Portal Sign In</Link></div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px', fontSize: '13px', color: '#E6D3A3' }}>Powered By Earthlungs</div>
        </div>
      </footer>
    </div>
  )
}
