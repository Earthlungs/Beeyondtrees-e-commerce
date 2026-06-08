"use client"

import { Header } from "@/components/layout/Header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Globe, Leaf, Target, Heart, TreePine } from "lucide-react"

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: '#F5F1E8', minHeight: '100vh' }}>
      <Header />
      
      {/* Hero */}
      <section style={{ backgroundColor: '#6B7D5C', color: 'white', padding: '80px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 'bold', marginBottom: '16px' }}>About BEEyond Trees</h1>
        <p style={{ fontSize: '18px', maxWidth: '700px', margin: '0 auto', opacity: 0.9 }}>
          Sustaining Forest Adjacent Communities beyond tree planting and growing.
        </p>
      </section>

      {/* Mission */}
      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '64px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          {[
            { icon: Target, title: 'Our Mission', desc: 'To restore and protect ecosystems, fostering biodiversity and sustainable livelihoods through community-driven restoration and conservation efforts.' },
            { icon: Heart, title: 'Our Vision', desc: 'A greener, healthier planet where forest-adjacent communities thrive through sustainable nature-based enterprises.' },
            { icon: Globe, title: 'Our Impact', desc: '39 active sites across Kenya and Tanzania. Over 1.5 billion trees targeted by 2032 through community-led reforestation.' },
          ].map((item, i) => (
            <Card key={i} style={{ borderColor: '#A89F91', textAlign: 'center' }}>
              <CardContent style={{ padding: '28px' }}>
                <div style={{ width: '56px', height: '56px', backgroundColor: '#F5F1E8', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <item.icon size={26} style={{ color: '#6B7D5C' }} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#4A3F2F', marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ color: '#A89F91', fontSize: '14px', lineHeight: 1.7 }}>{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', border: '1px solid #A89F91', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#4A3F2F', marginBottom: '16px' }}>Our Story</h2>
          <p style={{ color: '#A89F91', lineHeight: 1.8, fontSize: '15px', marginBottom: '16px' }}>
            BEEyond Trees was born from a simple yet powerful realization: reforestation efforts cannot succeed without the active participation and economic empowerment of forest-adjacent communities. As a flagship initiative of EarthLungs Reforestation Foundation, we bridge the gap between environmental conservation and sustainable livelihoods.
          </p>
          <p style={{ color: '#A89F91', lineHeight: 1.8, fontSize: '15px', marginBottom: '16px' }}>
            Our model integrates nature-based enterprises - from sustainable honey production to mushroom farming and artisan crafts - directly into reforestation projects. This creates a virtuous cycle where communities have both the means and motivation to protect and restore their surrounding forests.
          </p>
          <p style={{ color: '#A89F91', lineHeight: 1.8, fontSize: '15px' }}>
            Every product sold through this platform directly supports tree planting, community development, and ecosystem restoration across Kenya, Tanzania, and Mozambique.
          </p>
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#4A3F2F', marginBottom: '24px', textAlign: 'center' }}>Core Values</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {[
            { icon: Globe, title: 'Environmental Stewardship', desc: 'We protect and restore our natural environment for future generations.' },
            { icon: Users, title: 'Community First', desc: 'Communities are at the heart of everything we do and build.' },
            { icon: Leaf, title: 'Innovation', desc: 'We develop creative solutions to complex environmental challenges.' },
            { icon: TreePine, title: 'Impact Driven', desc: 'We measure our success by the positive impact we create.' },
          ].map((v, i) => (
            <div key={i} style={{ padding: '24px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #A89F91' }}>
              <v.icon size={24} style={{ color: '#6B7D5C', marginBottom: '12px' }} />
              <h4 style={{ fontWeight: '600', color: '#4A3F2F', marginBottom: '6px', fontSize: '15px' }}>{v.title}</h4>
              <p style={{ fontSize: '13px', color: '#A89F91', lineHeight: 1.6 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
