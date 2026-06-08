"use client"

import { Header } from "@/components/layout/Header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, TreePine, Users, Globe } from "lucide-react"

export default function WhereWeWorkPage() {
  const locations = [
    {
      country: "Kenya",
      flag: "KE",
      sites: 28,
      description: "Our headquarters and main tree nursery operations. Active across multiple counties including Nairobi, Kiambu, Machakos, and Kajiado.",
      highlights: ["HQ & Main Nursery", "28 Active Sites", "Community Training Center"],
    },
    {
      country: "Tanzania",
      flag: "TZ",
      sites: 11,
      description: "Community forestry and agroforestry programs in partnership with local villages and conservation groups.",
      highlights: ["11 Active Sites", "Agroforestry Programs", "Village Partnerships"],
    },
    {
      country: "Mozambique",
      flag: "MZ",
      sites: 0,
      description: "Mangrove restoration and coastal conservation. New expansion underway with community engagement.",
      highlights: ["Mangrove Restoration", "Coastal Conservation", "Coming 2025"],
    },
    {
      country: "Madagascar",
      flag: "MG",
      sites: 0,
      description: "Planned expansion for unique biodiversity conservation and community forest management.",
      highlights: ["Biodiversity Hotspot", "Community Forestry", "Coming 2026"],
    },
  ]

  return (
    <div style={{ backgroundColor: '#F5F1E8', minHeight: '100vh' }}>
      <Header />
      
      <section style={{ backgroundColor: '#6B7D5C', color: 'white', padding: '60px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 'bold', marginBottom: '8px' }}>Where We Work</h1>
        <p style={{ fontSize: '16px', opacity: 0.9 }}>Our operations span across key regions in Sub-Saharan Africa</p>
      </section>

      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          {[
            { icon: Globe, value: '39', label: 'Active Sites' },
            { icon: Users, value: '4', label: 'Countries' },
            { icon: TreePine, value: '1.5B', label: 'Trees Target' },
          ].map((stat, i) => (
            <Card key={i} style={{ borderColor: '#A89F91', textAlign: 'center' }}>
              <CardContent style={{ padding: '32px' }}>
                <stat.icon size={32} style={{ color: '#6B7D5C', margin: '0 auto 12px' }} />
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#4A3F2F', marginBottom: '4px' }}>{stat.value}</div>
                <div style={{ fontSize: '14px', color: '#A89F91' }}>{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#4A3F2F', marginBottom: '24px' }}>Our Locations</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {locations.map((loc, i) => (
            <Card key={i} style={{ borderColor: '#A89F91' }}>
              <CardContent style={{ padding: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '56px', height: '56px', backgroundColor: '#6B7D5C', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', fontWeight: 'bold', flexShrink: 0 }}>
                    {loc.flag}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#4A3F2F' }}>{loc.country}</h3>
                    <Badge style={{ backgroundColor: '#E6D3A3', color: '#4A3F2F', border: 'none' }}>{loc.sites > 0 ? `${loc.sites} sites` : 'Expanding'}</Badge>
                  </div>
                </div>
                <p style={{ color: '#A89F91', fontSize: '14px', lineHeight: 1.7, marginBottom: '16px' }}>{loc.description}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {loc.highlights.map((h, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4A3F2F' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#6B7D5C', flexShrink: 0 }} />
                      {h}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
