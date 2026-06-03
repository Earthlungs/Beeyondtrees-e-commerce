"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useCartStore } from "@/store/cart-store"
import { ShoppingCart, Trash2, Plus, Minus, Leaf } from "lucide-react"
import Link from "next/link"

export function CartSheet() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, getTotal, clearCart } = useCartStore()

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent style={{ width: '400px', maxWidth: '90vw' }}>
        <SheetHeader>
          <SheetTitle style={{ color: '#4A3F2F', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} /> Cart ({items.length})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#A89F91' }}>
            <ShoppingCart size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p>Your cart is empty</p>
            <Link href="/products" onClick={() => setIsOpen(false)}>
              <Button style={{ marginTop: '16px', backgroundColor: '#6B7D5C', color: 'white' }}>Browse Products</Button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 80px)' }}>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
              {items.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: '1px solid #A89F91' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#F5F1E8', flexShrink: 0 }}>
                    {item.image ? (
                      <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Leaf size={20} style={{ color: '#6B7D5C' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <p style={{ fontWeight: '500', fontSize: '14px', color: '#4A3F2F' }}>{item.name}</p>
                      <button onClick={() => removeItem(item.id)} style={{ color: '#8C6A4A', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6B7D5C', textTransform: 'uppercase' }}>{item.pricingTier}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}
                          style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #A89F91', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Minus size={12} />
                        </button>
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.maxQuantity}
                          style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #A89F91', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={12} />
                        </button>
                      </div>
                      <span style={{ fontWeight: 'bold', color: '#4A3F2F' }}>KSh {(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '2px solid #A89F91', paddingTop: '16px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontWeight: '500', color: '#4A3F2F' }}>Total</span>
                <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#4A3F2F' }}>KSh {getTotal().toLocaleString()}</span>
              </div>
              <Link href="/checkout" onClick={() => setIsOpen(false)}>
                <Button style={{ width: '100%', backgroundColor: '#6B7D5C', color: 'white', height: '44px' }}>Proceed to Checkout</Button>
              </Link>
              <button onClick={clearCart} style={{ width: '100%', marginTop: '8px', padding: '8px', background: 'none', border: 'none', color: '#8C6A4A', cursor: 'pointer', fontSize: '14px' }}>
                Clear Cart
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
