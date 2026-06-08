"use client"

import { useState } from "react"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Phone, MapPin, Send, Clock } from "lucide-react"

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div style={{ backgroundColor: '#F5F1E8', minHeight: '100vh' }}>
      <Header />
      
      <section style={{ backgroundColor: '#6B7D5C', color: 'white', padding: '60px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 'bold', marginBottom: '8px' }}>Contact Us</h1>
        <p style={{ fontSize: '16px', opacity: 0.9 }}>We'd love to hear from you</p>
      </section>

      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
          {/* Contact Info */}
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#4A3F2F', marginBottom: '24px' }}>Get in Touch</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Card style={{ borderColor: '#A89F91' }}>
                <CardContent style={{ padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', backgroundColor: '#F5F1E8', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={20} style={{ color: '#6B7D5C' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#A89F91', marginBottom: '2px' }}>Email</p>
                    <p style={{ fontWeight: '500', color: '#4A3F2F', fontSize: '15px' }}>beeyondtrees@earthlungs.org</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card style={{ borderColor: '#A89F91' }}>
                <CardContent style={{ padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', backgroundColor: '#F5F1E8', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone size={20} style={{ color: '#6B7D5C' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#A89F91', marginBottom: '2px' }}>Phone</p>
                    <p style={{ fontWeight: '500', color: '#4A3F2F', fontSize: '15px' }}>+254 718 681 684</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card style={{ borderColor: '#A89F91' }}>
                <CardContent style={{ padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', backgroundColor: '#F5F1E8', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MapPin size={20} style={{ color: '#6B7D5C' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#A89F91', marginBottom: '2px' }}>Location</p>
                    <p style={{ fontWeight: '500', color: '#4A3F2F', fontSize: '15px' }}>Nairobi, Kenya</p>
                  </div>
                </CardContent>
              </Card>

              <Card style={{ borderColor: '#A89F91' }}>
                <CardContent style={{ padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', backgroundColor: '#F5F1E8', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={20} style={{ color: '#6B7D5C' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#A89F91', marginBottom: '2px' }}>Business Hours</p>
                    <p style={{ fontWeight: '500', color: '#4A3F2F', fontSize: '15px' }}>Mon - Fri: 8AM - 5PM</p>
                    <p style={{ fontWeight: '500', color: '#4A3F2F', fontSize: '15px' }}>Sat: 9AM - 1PM</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#4A3F2F', marginBottom: '24px' }}>Send us a Message</h2>
            <Card style={{ borderColor: '#A89F91' }}>
              <CardContent style={{ padding: '24px' }}>
                {sent ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ width: '64px', height: '64px', backgroundColor: '#6B7D5C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Send size={28} style={{ color: 'white' }} />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#4A3F2F', marginBottom: '8px' }}>Message Sent!</h3>
                    <p style={{ color: '#A89F91', fontSize: '14px' }}>We'll get back to you within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#4A3F2F' }}>Your Name</label>
                      <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="John Doe" required />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#4A3F2F' }}>Your Email</label>
                      <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} type="email" placeholder="john@example.com" required />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#4A3F2F' }}>Subject</label>
                      <Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="How can we help?" required />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#4A3F2F' }}>Your Message</label>
                      <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows={5} placeholder="Tell us more..." required
                        style={{ width: '100%', borderRadius: '6px', border: '1px solid #A89F91', padding: '10px 12px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                    <Button type="submit" style={{ backgroundColor: '#6B7D5C', color: 'white', height: '44px' }}>
                      <Send size={16} style={{ marginRight: '8px' }} /> Send Message
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
