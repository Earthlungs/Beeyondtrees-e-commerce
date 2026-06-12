"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCartStore } from "@/store/cart-store"
import { ArrowLeft, ShoppingCart, Truck, CreditCard } from "lucide-react"
import Link from "next/link"

const counties = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Machakos",
  "Kajiado", "Uasin Gishu", "Nyeri", "Meru", "Kisii", "Kilifi", "Laikipia",
]

export default function CheckoutPage() {
  const { items, getTotal } = useCartStore()
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<"delivery" | "payment">("delivery")
  const [paying, setPaying] = useState(false)
  const [customCounty, setCustomCounty] = useState("")
  
  const [form, setForm] = useState({
    fullName: "", phone: "", email: "", county: "",
    town: "", landmark: "", deliveryInstructions: "",
  })

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  if (items.length === 0) {
    return (
      <div style={{ backgroundColor: '#F5F1E8', minHeight: '100vh' }}>
        <Header />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '16px' }}>
          <ShoppingCart size={48} style={{ color: '#A89F91', marginBottom: '16px' }} />
          <h2 style={{ color: '#4A3F2F', marginBottom: '8px' }}>Cart is empty</h2>
          <Link href="/products">
            <Button style={{ backgroundColor: '#6B7D5C', color: 'white', marginTop: '16px' }}>Browse Products</Button>
          </Link>
        </div>
      </div>
    )
  }

  const handleCountyChange = (value: string) => {
    if (value === "Other") {
      setForm({...form, county: ""})
      setCustomCounty(value)
    } else {
      setForm({...form, county: value})
      setCustomCounty("")
    }
  }

  const effectiveCounty = customCounty === "Other" ? form.county : form.county

  const handleProceedToPayment = () => {
    if (!form.fullName || !form.phone || !effectiveCounty || !form.town) {
      alert("Fill in all required fields: Name, Phone, County, Town")
      return
    }
    setStep("payment")
  }

  const handlePay = async () => {
    if (paying) return
    setPaying(true)

    // 1. Persist a pending order. The cart item id is `${productId}-${tier}`;
    //    strip the tier to recover the productId for the OrderItem.
    let orderId: string
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.fullName,
          customerPhone: form.phone,
          customerEmail: form.email || null,
          county: effectiveCounty,
          town: form.town,
          landmark: form.landmark,
          deliveryInstructions: form.deliveryInstructions,
          total: getTotal(),
          items: items.map(i => ({
            productId: i.id.endsWith(`-${i.pricingTier}`)
              ? i.id.slice(0, -(i.pricingTier.length + 1))
              : i.id,
            productName: i.name,
            price: i.price,
            quantity: i.quantity,
            pricingTier: i.pricingTier,
            subtotal: i.price * i.quantity,
          })),
        }),
      })
      const created = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(created?.error || "Could not start your order. Please try again.")
        setPaying(false)
        return
      }
      orderId = created.id
    } catch (err) {
      console.error(err)
      alert("Could not start your order. Please check your connection and try again.")
      setPaying(false)
      return
    }

    // 2. Initialize the payment server-side (secret key) and redirect to
    //    Paystack's hosted checkout. On return, /checkout/verify confirms it.
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.authorization_url) {
        alert(data?.error || "Could not start payment. Please try again.")
        setPaying(false)
        return
      }
      window.location.href = data.authorization_url
    } catch (err) {
      console.error(err)
      alert("Could not reach the payment provider. Please try again.")
      setPaying(false)
    }
  }

  const OrderSummary = () => (
    <Card style={{ borderColor: '#A89F91' }}>
      <CardHeader style={{ paddingBottom: '8px' }}>
        <CardTitle style={{ fontSize: '16px', color: '#4A3F2F' }}>Order Summary</CardTitle>
      </CardHeader>
      <CardContent style={{ paddingTop: 0 }}>
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F5F1E8', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: '500', color: '#4A3F2F', margin: 0, wordBreak: 'break-word' }}>{item.name}</p>
              <p style={{ fontSize: '11px', color: '#A89F91', margin: 0 }}>{item.pricingTier} x {item.quantity}</p>
            </div>
            <span style={{ fontSize: '13px', color: '#4A3F2F', whiteSpace: 'nowrap' }}>KSh {(item.price * item.quantity).toLocaleString()}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', paddingTop: '10px', borderTop: '2px solid #A89F91' }}>
          <span style={{ fontWeight: 'bold', color: '#4A3F2F', fontSize: '15px' }}>Total</span>
          <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#4A3F2F' }}>KSh {getTotal().toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div style={{ backgroundColor: '#F5F1E8', minHeight: '100vh' }}>
      <Header />
      <div style={{ padding: '16px', maxWidth: '100%', overflowX: 'hidden' }}>
        <Link href="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#6B7D5C', textDecoration: 'none', marginBottom: '16px', fontSize: '14px' }}>
          <ArrowLeft size={16} /> Back
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="lg:grid lg:grid-cols-[1fr_380px]">
            <div>
              {step === "delivery" && (
                <Card style={{ borderColor: '#A89F91' }}>
                  <CardHeader style={{ paddingBottom: '8px' }}>
                    <CardTitle style={{ fontSize: '17px', color: '#4A3F2F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck size={18} /> Delivery Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div><label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#4A3F2F' }}>Full Name *</label><Input value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="Jane Muthoni" /></div>
                      <div><label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#4A3F2F' }}>Phone Number *</label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="0712 345 678" type="tel" /></div>
                      <div><label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#4A3F2F' }}>Email</label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="jane@example.com" type="email" /></div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#4A3F2F' }}>County *</label>
                        <select value={customCounty === "Other" ? "Other" : form.county} onChange={e => handleCountyChange(e.target.value)}
                          style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #A89F91', padding: '0 12px', fontSize: '16px', backgroundColor: 'white', color: '#4A3F2F', maxWidth: '100%' }}>
                          <option value="">Select County</option>
                          {counties.map(c => <option key={c} value={c}>{c}</option>)}
                          <option value="Other">Other (specify)</option>
                        </select>
                        {customCounty === "Other" && <Input value={form.county} onChange={e => setForm({...form, county: e.target.value})} placeholder="Type your county" style={{ marginTop: '8px' }} />}
                      </div>
                      <div><label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#4A3F2F' }}>Town/Estate *</label><Input value={form.town} onChange={e => setForm({...form, town: e.target.value})} placeholder="Kilimani, Lavington" /></div>
                      <div><label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#4A3F2F' }}>Landmark</label><Input value={form.landmark} onChange={e => setForm({...form, landmark: e.target.value})} placeholder="Near ABC Plaza" /></div>
                      <div><label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#4A3F2F' }}>Delivery Instructions</label><Input value={form.deliveryInstructions} onChange={e => setForm({...form, deliveryInstructions: e.target.value})} placeholder="Call when you arrive" /></div>
                    </div>
                    <Button style={{ width: '100%', marginTop: '16px', backgroundColor: '#6B7D5C', color: 'white', height: '48px', fontSize: '16px' }} onClick={handleProceedToPayment}>
                      Proceed to Payment
                    </Button>
                  </CardContent>
                </Card>
              )}

              {step === "payment" && (
                <Card style={{ borderColor: '#A89F91' }}>
                  <CardHeader style={{ paddingBottom: '8px' }}>
                    <CardTitle style={{ fontSize: '17px', color: '#4A3F2F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CreditCard size={18} /> Pay with Paystack
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div style={{ padding: '14px', backgroundColor: '#F5F1E8', borderRadius: '8px', marginBottom: '14px' }}>
                      <p style={{ fontSize: '13px', color: '#A89F91', marginBottom: '4px' }}>Delivering to:</p>
                      <p style={{ fontWeight: '500', color: '#4A3F2F', margin: 0, fontSize: '15px' }}>{form.fullName}</p>
                      <p style={{ fontSize: '14px', color: '#4A3F2F', margin: '2px 0' }}>{form.phone}</p>
                      <p style={{ fontSize: '14px', color: '#4A3F2F', margin: 0 }}>{form.town}, {effectiveCounty}</p>
                    </div>
                    <p style={{ color: '#A89F91', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                      Pay securely via M-Pesa, Airtel Money, or bank card through Paystack.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <Button disabled={paying} style={{ width: '100%', backgroundColor: '#6B7D5C', color: 'white', height: '48px', fontSize: '16px' }} onClick={handlePay}>
                        <CreditCard size={18} style={{ marginRight: '8px' }} />
                        {paying ? "Starting payment…" : `Pay KSh ${getTotal().toLocaleString()}`}
                      </Button>
                      <Button variant="outline" disabled={paying} style={{ width: '100%', borderColor: '#A89F91', color: '#A89F91' }} onClick={() => setStep("delivery")}>
                        Back
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <div><OrderSummary /></div>
          </div>
        </div>
      </div>
    </div>
  )
}
