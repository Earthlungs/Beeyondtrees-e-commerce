"use client"

import { Header } from "@/components/layout/Header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Briefcase, Heart, Users, Leaf, Globe, ArrowRight, MapPin, Clock, Send } from "lucide-react"
import Link from "next/link"

export default function CareersPage() {
  const benefits = [
    { icon: Globe, title: "Environmental Impact", desc: "Make a real difference in reforestation and community development across Africa." },
    { icon: Users, title: "Passionate Teams", desc: "Work alongside dedicated conservationists and community leaders." },
    { icon: Leaf, title: "Growth & Development", desc: "Continuous learning opportunities in conservation and sustainable development." },
    { icon: Heart, title: "Competitive Package", desc: "Competitive compensation, health benefits, and flexible working arrangements." },
  ]

  return (
    <div style={{ backgroundColor: '#F5F1E8', minHeight: '100vh' }}>
      <Header />
      
      <section style={{ backgroundColor: '#6B7D5C', color: 'white', padding: '60px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 'bold', marginBottom: '8px' }}>Join Our Team</h1>
        <p style={{ fontSize: '16px', opacity: 0.9, maxWidth: '600px', margin: '0 auto' }}>
          Be part of the change you want to see. Help us sustain forest-adjacent communities across Africa.
        </p>
      </section>

      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 16px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#4A3F2F', marginBottom: '12px', textAlign: 'center' }}>Why Work With Us?</h2>
        <p style={{ textAlign: 'center', color: '#A89F91', marginBottom: '32px', fontSize: '15px' }}>
          Join a mission-driven organization making tangible impact across Sub-Saharan Africa.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '48px' }}>
          {benefits.map((b, i) => (
            <Card key={i} style={{ borderColor: '#A89F91' }}>
              <CardContent style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', backgroundColor: '#F5F1E8', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <b.icon size={22} style={{ color: '#6B7D5C' }} />
                </div>
                <h3 style={{ fontWeight: '600', color: '#4A3F2F', marginBottom: '6px', fontSize: '15px' }}>{b.title}</h3>
                <p style={{ fontSize: '13px', color: '#A89F91', lineHeight: 1.6 }}>{b.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#4A3F2F', marginBottom: '20px', textAlign: 'center' }}>Current Openings</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {[...Array(6)].map((_, i) => (
            <Card key={i} style={{ borderColor: '#A89F91', backgroundColor: 'white' }}>
              <CardContent style={{ padding: '20px', textAlign: 'center' }}>
                <Briefcase size={28} style={{ color: '#A89F91', marginBottom: '12px' }} />
                <p style={{ color: '#A89F91', fontSize: '14px' }}>To be announced</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '32px', padding: '32px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #A89F91' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#4A3F2F', marginBottom: '8px' }}>Don't see a fit?</h3>
          <p style={{ color: '#A89F91', fontSize: '14px', marginBottom: '16px' }}>
            We're always looking for passionate people. Send us your CV and tell us how you can contribute.
          </p>
          <Link href="/contact">
            <Button style={{ backgroundColor: '#6B7D5C', color: 'white' }}>
              <Send size={14} style={{ marginRight: '6px' }} /> Contact Us
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
