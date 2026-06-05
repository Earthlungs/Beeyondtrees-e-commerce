"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Search, ChevronLeft, ChevronRight, TreePine, Users, Globe, Leaf, Sprout, Mail, Phone, MapPin, Send, Heart, Lightbulb, TrendingUp } from "lucide-react"

export default function Home() {
  const [maxPrice, setMaxPrice] = useState(100000)
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('beeyond-trees-products')
    if (stored) setProducts(JSON.parse(stored))
  }, [])

  return (
    <div style={{ backgroundColor: 'white' }}>
      <Header />

      {/* Hero */}
      <section style={{ 
        background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.3)), url("https://images.unsplash.com/photo-1448375240586-882707db888b?w=1400") center/cover',
        color: 'white', padding: '100px 24px', textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 'bold', marginBottom: '16px', lineHeight: 1.2 }}>
            BEEyond Trees
          </h1>
          <p style={{ fontSize: '18px', marginBottom: '32px', opacity: 0.9 }}>
            Sustaining Forest Adjacent Communities beyond tree planting and growing.
          </p>
          <Link href="/products">
            <Button size="lg" style={{ backgroundColor: '#6B7D5C', color: 'white', border: 'none', height: '48px', padding: '0 32px', fontSize: '16px', fontWeight: '600' }}>
              Shop Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Search & Filter */}
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
          <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>Max Price: KSh {maxPrice.toLocaleString()}</p>
        </div>
      </section>

      {/* Our Collection - loads from localStorage/admin */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px 48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#6B7D5C', marginBottom: '24px' }}>Our Collection</h2>
        
        {products.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {products.map(product => (
              <Link key={product.id} href={`/products/${product.name.toLowerCase().replace(/\s+/g, "-")}`} style={{ textDecoration: 'none' }}>
                <Card style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
                  <div style={{ height: '180px', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '16px' }} />
                    ) : (
                      <TreePine size={40} style={{ color: '#6B7D5C', opacity: 0.3 }} />
                    )}
                  </div>
                  <CardContent style={{ padding: '14px' }}>
                    <h3 style={{ fontWeight: '600', color: '#6B7D5C', marginBottom: '4px', fontSize: '15px' }}>{product.name}</h3>
                    <p style={{ fontWeight: 'bold', color: '#6B7D5C', fontSize: '16px', marginBottom: '4px' }}>KSh {product.retailPrice?.toLocaleString() || product.price?.toLocaleString()}</p>
                    <p style={{ fontSize: '12px', color: '#6B7280' }}>{product.stock || product.inventory} units</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px', color: '#9CA3AF' }}>
            <TreePine size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>No products yet</p>
            <p style={{ fontSize: '14px' }}>Add products in the admin panel to display them here.</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
          <button style={{ background: 'none', border: '1px solid #D1D5DB', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '14px', color: '#6B7D5C', fontWeight: '500' }}>1</span>
          <button style={{ background: 'none', border: '1px solid #D1D5DB', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronRight size={16} />
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>20 per page (2 rows)</p>
      </section>

      {/* About Section */}
      <section style={{ backgroundColor: '#F9FAFB', padding: '64px 16px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#6B7D5C', marginBottom: '16px', textAlign: 'center' }}>About BEEyond Trees</h2>
          <p style={{ maxWidth: '800px', margin: '0 auto 32px', textAlign: 'center', color: '#4B5563', lineHeight: 1.7, fontSize: '15px' }}>
            BEEyond Trees is a flagship sustainability and community livelihood initiative developed by EarthLungs Reforestation Foundation in Kenya. It complements EarthLungs' core reforestation mission by integrating nature-based enterprises that deliver long-term economic benefits to forest-adjacent communities while ensuring ecological stewardship of restored landscapes.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', textAlign: 'center' }}>
            {[
              { icon: Sprout, label: 'Reforestation' },
              { icon: Users, label: 'Community First' },
              { icon: Globe, label: 'Sustainability' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '24px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <item.icon size={32} style={{ color: '#6B7D5C', margin: '0 auto 12px' }} />
                <p style={{ fontWeight: '600', color: '#6B7D5C', fontSize: '15px' }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Where We Work */}
      <section style={{ padding: '64px 16px', maxWidth: '1280px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#6B7D5C', marginBottom: '24px', textAlign: 'center' }}>Where We Work</h2>
        <p style={{ textAlign: 'center', color: '#4B5563', marginBottom: '32px' }}>Our operations span across key regions in Kenya</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          {[
            { country: 'Kenya', desc: 'Our headquarters and main tree nursery operations' },
            { country: 'Tanzania', desc: 'Community forestry and agroforestry programs' },
            { country: 'Mozambique', desc: 'Mangrove restoration and coastal conservation' },
          ].map((loc, i) => (
            <div key={i} style={{ padding: '28px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>
                {loc.country === 'Kenya' ? 'KE' : loc.country === 'Tanzania' ? 'TZ' : 'MZ'}
              </div>
              <h3 style={{ fontWeight: '600', color: '#6B7D5C', marginBottom: '8px', fontSize: '17px' }}>{loc.country}</h3>
              <p style={{ color: '#6B7280', fontSize: '14px' }}>{loc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* New Arrivals - loads from localStorage */}
      <section style={{ backgroundColor: '#F9FAFB', padding: '64px 16px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#6B7D5C', marginBottom: '8px' }}>New Arrivals</h2>
          <p style={{ color: '#6B7280', marginBottom: '24px', fontSize: '14px' }}>Be the first to discover our latest products</p>
          
          {products.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
              {products.slice(-4).map(product => (
                <Link key={product.id} href={`/products/${product.name.toLowerCase().replace(/\s+/g, "-")}`} style={{ textDecoration: 'none' }}>
                  <Card style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ height: '180px', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '16px' }} />
                      ) : (
                        <TreePine size={40} style={{ color: '#6B7D5C', opacity: 0.3 }} />
                      )}
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
          ) : null}
        </div>
      </section>

      {/* Careers */}
      <section style={{ padding: '64px 16px', maxWidth: '1280px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#6B7D5C', marginBottom: '8px', textAlign: 'center' }}>Join Our Team</h2>
        <p style={{ textAlign: 'center', color: '#6B7280', marginBottom: '32px' }}>Be part of the change you want to see</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '40px' }}>
          {['Make a real environmental impact', 'Work with passionate communities', 'Grow your skills in conservation', 'Competitive compensation and benefits'].map((item, i) => (
            <div key={i} style={{ padding: '20px', backgroundColor: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
              <p style={{ color: '#6B7D5C', fontWeight: '500', fontSize: '14px' }}>{item}</p>
            </div>
          ))}
        </div>
        
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#6B7D5C', marginBottom: '16px', textAlign: 'center' }}>Current Openings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ padding: '20px', backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>
              To be announced
            </div>
          ))}
        </div>
      </section>

      {/* EarthLungs */}
      <section style={{ backgroundColor: '#F9FAFB', padding: '64px 16px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <Badge style={{ backgroundColor: '#6B7D5C', color: 'white', marginBottom: '12px', display: 'block', width: 'fit-content', margin: '0 auto 12px' }}>Our Parent Organization</Badge>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#6B7D5C', textAlign: 'center', marginBottom: '24px' }}>Earthlungs Foundation</h2>
          
          <p style={{ color: '#4B5563', lineHeight: 1.8, marginBottom: '24px', fontSize: '15px' }}>
            EarthLungs Reforestation Foundation is a community-led, African-founded nonprofit organization dedicated to restoring degraded ecosystems across Sub-Saharan Africa. Since our inception in 2021, we have grown into a regional powerhouse in nature-based climate action. With a vision to plant, protect, and sustain 1.5 billion trees by 2032. We currently operate 39 active sites across Kenya and Tanzania, with new expansions underway in Mozambique and Madagascar.
          </p>
          
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#6B7D5C', marginBottom: '12px' }}>Our Mission</h3>
          <p style={{ color: '#4B5563', lineHeight: 1.8, marginBottom: '24px', fontSize: '15px' }}>
            To restore and protect ecosystems, fostering biodiversity and sustainable livelihoods through community-driven restoration and conservation efforts.
          </p>

          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#6B7D5C', marginBottom: '16px' }}>Core Values</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { icon: Globe, label: 'Environmental Stewardship', desc: 'We protect and restore our natural environment' },
              { icon: Users, label: 'Community First', desc: 'Communities are at the heart of everything we do' },
              { icon: Lightbulb, label: 'Innovation', desc: 'We develop creative solutions to complex problems' },
              { icon: TrendingUp, label: 'Impact Driven', desc: 'We measure success by our positive impact' },
            ].map((v, i) => (
              <div key={i} style={{ padding: '20px', backgroundColor: 'white', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
                <v.icon size={24} style={{ color: '#6B7D5C', marginBottom: '8px' }} />
                <h4 style={{ fontWeight: '600', color: '#6B7D5C', fontSize: '14px' }}>{v.label}</h4>
                <p style={{ fontSize: '13px', color: '#6B7280' }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section style={{ padding: '64px 16px', maxWidth: '1280px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#6B7D5C', marginBottom: '8px', textAlign: 'center' }}>Contact Us</h2>
        <p style={{ textAlign: 'center', color: '#6B7280', marginBottom: '32px' }}>We'd love to hear from you</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Mail size={20} style={{ color: '#6B7D5C' }} />
              <div><p style={{ fontSize: '12px', color: '#6B7280' }}>Email</p><p style={{ fontWeight: '500', color: '#6B7D5C' }}>beeyondtrees@earthlungs.org</p></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Phone size={20} style={{ color: '#6B7D5C' }} />
              <div><p style={{ fontSize: '12px', color: '#6B7280' }}>Phone</p><p style={{ fontWeight: '500', color: '#6B7D5C' }}>+254 718 681 684</p></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MapPin size={20} style={{ color: '#6B7D5C' }} />
              <div><p style={{ fontSize: '12px', color: '#6B7280' }}>Location</p><p style={{ fontWeight: '500', color: '#6B7D5C' }}>Nairobi, Kenya</p></div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontWeight: '600', color: '#6B7D5C' }}>Send us a Message</p>
            <Input placeholder="Your Name" />
            <Input placeholder="Your Email" type="email" />
            <Input placeholder="Subject" />
            <textarea placeholder="Your Message" rows={4} style={{ width: '100%', borderRadius: '6px', border: '1px solid #D1D5DB', padding: '10px', fontSize: '14px', resize: 'vertical' }} />
            <Button style={{ backgroundColor: '#6B7D5C', color: 'white' }}>
              <Send size={14} style={{ marginRight: '6px' }} /> Send Message
            </Button>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section style={{ backgroundColor: '#F9FAFB', padding: '64px 16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#6B7D5C', marginBottom: '24px', textAlign: 'center' }}>Frequently Asked Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['What are the pricing tiers?', 'How does Paystack payment work?', 'Delivery time?'].map((q, i) => (
              <div key={i} style={{ padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '500', color: '#6B7D5C', fontSize: '14px' }}>{q}</span>
                <ChevronRight size={16} style={{ color: '#9CA3AF' }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#6B7D5C', color: 'white', padding: '48px 16px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px', marginBottom: '32px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>BEEyond Trees</h3>
              <p style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: 1.6 }}>Sustainable natural products from Kenya.</p>
            </div>
            <div>
              <h4 style={{ fontWeight: '600', marginBottom: '12px', fontSize: '14px' }}>Quick Links</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
                <Link href="/" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Home</Link>
                <Link href="/about" style={{ color: '#9CA3AF', textDecoration: 'none' }}>About</Link>
                <Link href="/new-arrivals" style={{ color: '#9CA3AF', textDecoration: 'none' }}>New Arrivals</Link>
                <Link href="/contact" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Contact</Link>
              </div>
            </div>
            <div>
              <h4 style={{ fontWeight: '600', marginBottom: '12px', fontSize: '14px' }}>Contact</h4>
              <div style={{ fontSize: '14px', color: '#9CA3AF', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span>Nairobi, Kenya</span>
                <span>+254 718 681 684</span>
              </div>
            </div>
            <div>
              <h4 style={{ fontWeight: '600', marginBottom: '12px', fontSize: '14px' }}>Portal</h4>
              <Link href="/admin/login" style={{ color: '#9CA3AF', textDecoration: 'none', fontSize: '14px' }}>Access our portal</Link>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px', textAlign: 'center', fontSize: '13px', color: '#9CA3AF' }}>
            Powered By Earthlungs
          </div>
        </div>
      </footer>
    </div>
  )
}
