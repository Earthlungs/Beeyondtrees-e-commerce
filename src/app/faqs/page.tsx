"use client"

import { useState } from "react"
import { Header } from "@/components/layout/Header"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react"

export default function FAQsPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    { q: "What are the pricing tiers?", a: "We offer three pricing tiers: Retail (1-11 units) for individual customers, Wholesale (12-36 units) for bulk buyers, and Distributor (37+ units) for large-scale distributors. Each tier has its own pricing to ensure fair value across all levels." },
    { q: "How does Paystack payment work?", a: "Paystack is our secure payment partner. When you place an order, you'll be redirected to a secure Paystack payment page where you can pay using M-Pesa, Airtel Money, or bank cards. Your payment is processed instantly and securely." },
    { q: "What is the delivery time?", a: "Delivery times vary by location. Within Nairobi, delivery typically takes 1-2 business days. For other counties, expect 3-5 business days. You'll receive tracking information once your order is dispatched." },
    { q: "How does BEEyond Trees support communities?", a: "Every purchase directly supports forest-adjacent communities through our partnership with EarthLungs Reforestation Foundation. Revenue is reinvested into tree planting, community training, and sustainable livelihood programs." },
    { q: "Can I return or exchange products?", a: "Yes, we accept returns within 7 days of delivery for unused products in original packaging. Contact our support team at beeyondtrees@earthlungs.org to initiate a return." },
    { q: "Do you ship internationally?", a: "Currently, we ship within Kenya and select East African countries. For international inquiries, please contact us directly." },
    { q: "How can I become a distributor?", a: "Visit our Careers page or contact us directly. We're always looking for partners who share our mission of sustainable community development." },
    { q: "Where do your products come from?", a: "All our products are sourced from forest-adjacent communities we work with. From honey to mushrooms to handcrafted items, each product has a direct impact story behind it." },
  ]

  return (
    <div style={{ backgroundColor: '#F5F1E8', minHeight: '100vh' }}>
      <Header />
      
      <section style={{ backgroundColor: '#6B7D5C', color: 'white', padding: '60px 24px', textAlign: 'center' }}>
        <HelpCircle size={40} style={{ marginBottom: '16px' }} />
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 'bold', marginBottom: '8px' }}>Frequently Asked Questions</h1>
        <p style={{ fontSize: '16px', opacity: 0.9 }}>Everything you need to know about BEEyond Trees</p>
      </section>

      <section style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {faqs.map((faq, i) => (
            <Card key={i} style={{ borderColor: '#A89F91', cursor: 'pointer' }} onClick={() => setOpenIndex(openIndex === i ? null : i)}>
              <CardContent style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontWeight: '600', color: '#4A3F2F', fontSize: '15px', marginBottom: openIndex === i ? '12px' : '0' }}>{faq.q}</h3>
                    {openIndex === i && (
                      <p style={{ color: '#A89F91', fontSize: '14px', lineHeight: 1.7 }}>{faq.a}</p>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, color: '#6B7D5C', marginTop: '2px' }}>
                    {openIndex === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
