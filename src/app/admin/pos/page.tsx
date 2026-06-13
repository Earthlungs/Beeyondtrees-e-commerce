"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search, Plus, Minus, Trash2, ShoppingCart, X,
  Banknote, Smartphone, CreditCard, AlertTriangle, Loader2,
} from "lucide-react"
import { useProductStore, productImageUrl, type Product } from "@/store/product-store"

type Tier = "retail" | "wholesale" | "distributor"
type Method = "cash" | "mpesa" | "card"

interface Line {
  productId: string
  name: string
  tier: Tier
  quantity: number
  stock: number
  prices: { retail: number; wholesale: number; distributor: number }
  updatedAt?: string
}

const DARK = "#3D3226"
const GREEN = "#6B7D5C"
const CREAM = "#F5F1E8"
const TEXT = "#4A3F2F"
const MUTED = "#A89F91"
const BROWN = "#8C6A4A"

const ksh = (n: number) => `KSh ${n.toLocaleString()}`
const tierPrice = (l: Pick<Line, "prices" | "tier">) => l.prices[l.tier]
const keyOf = (productId: string, tier: Tier) => `${productId}::${tier}`

export default function PosPage() {
  const router = useRouter()
  const { products, loadProducts, loading } = useProductStore()
  const [query, setQuery] = useState("")
  const [lines, setLines] = useState<Line[]>([])
  const [method, setMethod] = useState<Method | null>(null)
  const [cashReceived, setCashReceived] = useState("")
  const [mpesaCode, setMpesaCode] = useState("")
  const [cardRef, setCardRef] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<{ text: string; tone: "error" | "success" } | null>(null)

  useEffect(() => { loadProducts() }, [])
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(t)
  }, [notice])

  // Match on name OR SKU — SKUs live inside the product name, e.g.
  // "THE TERRA DOT (BYT-CLY-PLN-007-S)", so a substring search covers both.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? products.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      : products
    return list.slice(0, 60)
  }, [products, query])

  const total = useMemo(
    () => lines.reduce((s, l) => s + tierPrice(l) * l.quantity, 0),
    [lines]
  )

  const addProduct = (p: Product) => {
    if (p.stock <= 0) return
    setLines((prev) => {
      const k = keyOf(p.id, "retail")
      const existing = prev.find((l) => keyOf(l.productId, l.tier) === k)
      if (existing) {
        return prev.map((l) =>
          keyOf(l.productId, l.tier) === k
            ? { ...l, quantity: Math.min(l.quantity + 1, l.stock) }
            : l
        )
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          tier: "retail",
          quantity: 1,
          stock: p.stock,
          prices: { retail: p.retailPrice, wholesale: p.wholesalePrice, distributor: p.distributorPrice },
          updatedAt: p.updatedAt,
        },
      ]
    })
  }

  const setQty = (k: string, qty: number) =>
    setLines((prev) =>
      prev.map((l) =>
        keyOf(l.productId, l.tier) === k
          ? { ...l, quantity: Math.max(1, Math.min(qty, l.stock)) }
          : l
      )
    )

  const setTier = (k: string, tier: Tier) =>
    setLines((prev) => {
      // Merge into an existing line if the same product already sits at that tier.
      const line = prev.find((l) => keyOf(l.productId, l.tier) === k)
      if (!line) return prev
      const targetKey = keyOf(line.productId, tier)
      const target = prev.find((l) => keyOf(l.productId, l.tier) === targetKey && l !== line)
      if (target) {
        return prev
          .filter((l) => l !== line)
          .map((l) =>
            l === target ? { ...l, quantity: Math.min(l.quantity + line.quantity, l.stock) } : l
          )
      }
      return prev.map((l) => (l === line ? { ...l, tier } : l))
    })

  const removeLine = (k: string) =>
    setLines((prev) => prev.filter((l) => keyOf(l.productId, l.tier) !== k))

  const resetSale = () => {
    setLines([]); setMethod(null); setCashReceived(""); setMpesaCode("")
    setCardRef(""); setCustomerName(""); setCustomerPhone("")
  }

  const change = method === "cash" && cashReceived ? Number(cashReceived) - total : 0

  const canComplete =
    lines.length > 0 &&
    !!method &&
    !submitting &&
    (method !== "cash" || (Number(cashReceived) >= total))

  const completeSale = async () => {
    if (!canComplete || !method) return
    setSubmitting(true)
    setNotice(null)
    try {
      const res = await fetch("/api/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, pricingTier: l.tier })),
          paymentMethod: method,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          cashReceived: method === "cash" ? Number(cashReceived) : null,
          mpesaCode: method === "mpesa" ? mpesaCode : null,
          cardRef: method === "card" ? cardRef : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409 && Array.isArray(data.items)) {
          const detail = data.items
            .map((i: { productName: string; available: number }) => `${i.productName} (${i.available} left)`)
            .join(", ")
          setNotice({ text: `Not enough stock: ${detail}. Please adjust quantities.`, tone: "error" })
          // Pull fresh stock so the cashier sees the real numbers.
          loadProducts(true)
        } else {
          setNotice({ text: data.error || "Could not complete the sale.", tone: "error" })
        }
        return
      }
      // Refresh shared stock (now reflects this sale) and open the receipt.
      loadProducts(true)
      resetSale()
      router.push(`/admin/pos/receipt/${data.id}`)
    } catch {
      setNotice({ text: "Network error — sale not recorded. Try again.", tone: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* ---------- Product picker ---------- */}
      <div style={{ flex: "1 1 420px", minWidth: 320 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <ShoppingCart size={22} color={GREEN} />
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Point of Sale</h1>
        </div>

        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={18} color={MUTED} style={{ position: "absolute", left: 12, top: 11 }} />
          <Input
            autoFocus
            placeholder="Search by name, SKU or category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 38, height: 42, fontSize: 15 }}
          />
        </div>

        {loading && products.length === 0 ? (
          <p style={{ color: MUTED, padding: 20 }}>Loading products…</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            {results.map((p) => {
              const out = p.stock <= 0
              return (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  disabled={out}
                  style={{
                    textAlign: "left", background: "white", border: "1px solid #E5E7EB",
                    borderRadius: 12, padding: 10, cursor: out ? "not-allowed" : "pointer",
                    opacity: out ? 0.5 : 1, display: "flex", flexDirection: "column", gap: 6,
                  }}
                >
                  <div style={{
                    width: "100%", aspectRatio: "1 / 1", borderRadius: 8, overflow: "hidden",
                    background: CREAM, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={productImageUrl(p)}
                      alt={p.name}
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden" }}
                    />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, lineHeight: 1.25, minHeight: 30 }}>
                    {p.name}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>{ksh(p.retailPrice)}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: out ? BROWN : p.stock <= 5 ? "#E6A817" : MUTED,
                    }}>
                      {out ? "Out" : `${p.stock} left`}
                    </span>
                  </div>
                </button>
              )
            })}
            {results.length === 0 && (
              <p style={{ color: MUTED, gridColumn: "1 / -1", padding: 20 }}>No products match “{query}”.</p>
            )}
          </div>
        )}
      </div>

      {/* ---------- Cart / checkout ---------- */}
      <div style={{
        flex: "0 0 360px", maxWidth: "100%", background: "white", borderRadius: 14,
        border: "1px solid #E5E7EB", padding: 16, position: "sticky", top: 16,
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Current Sale</div>

        {notice && (
          <div style={{
            display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8,
            background: notice.tone === "error" ? "#FBEAEA" : "#EAF3EA",
            color: notice.tone === "error" ? "#9B2C2C" : "#2F5D2F", fontSize: 12.5,
          }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{notice.text}</span>
          </div>
        )}

        {lines.length === 0 ? (
          <p style={{ color: MUTED, fontSize: 13, padding: "24px 0", textAlign: "center" }}>
            Tap products to add them to the sale.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto" }}>
            {lines.map((l) => {
              const k = keyOf(l.productId, l.tier)
              return (
                <div key={k} style={{ borderBottom: "1px solid #F0EDE6", paddingBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: TEXT, lineHeight: 1.3 }}>{l.name}</span>
                    <button onClick={() => removeLine(k)} style={{ background: "none", border: "none", cursor: "pointer", color: BROWN, flexShrink: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 8 }}>
                    <select
                      value={l.tier}
                      onChange={(e) => setTier(k, e.target.value as Tier)}
                      style={{ fontSize: 11.5, padding: "4px 6px", borderRadius: 6, border: "1px solid #E5E7EB", color: TEXT, background: CREAM }}
                    >
                      <option value="retail">Retail · {ksh(l.prices.retail)}</option>
                      <option value="wholesale">Wholesale · {ksh(l.prices.wholesale)}</option>
                      <option value="distributor">Distributor · {ksh(l.prices.distributor)}</option>
                    </select>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button onClick={() => setQty(k, l.quantity - 1)} style={stepBtn}><Minus size={13} /></button>
                      <span style={{ minWidth: 22, textAlign: "center", fontSize: 13, fontWeight: 600 }}>{l.quantity}</span>
                      <button onClick={() => setQty(k, l.quantity + 1)} disabled={l.quantity >= l.stock} style={stepBtn}><Plus size={13} /></button>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 12.5, fontWeight: 700, color: GREEN, marginTop: 4 }}>
                    {ksh(tierPrice(l) * l.quantity)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Optional customer */}
        <div style={{ display: "flex", gap: 8 }}>
          <Input placeholder="Customer name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ fontSize: 12.5, height: 36 }} />
          <Input placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={{ fontSize: 12.5, height: 36 }} />
        </div>

        {/* Total */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E5E7EB", paddingTop: 10 }}>
          <span style={{ fontSize: 14, color: TEXT }}>Total</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: DARK }}>{ksh(total)}</span>
        </div>

        {/* Payment method */}
        <div style={{ display: "flex", gap: 8 }}>
          {([
            { m: "cash" as Method, label: "Cash", Icon: Banknote },
            { m: "mpesa" as Method, label: "M-Pesa", Icon: Smartphone },
            { m: "card" as Method, label: "Card", Icon: CreditCard },
          ]).map(({ m, label, Icon }) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "8px 4px", borderRadius: 8, cursor: "pointer", fontSize: 11.5, fontWeight: 600,
                border: method === m ? `2px solid ${GREEN}` : "1px solid #E5E7EB",
                background: method === m ? "#EAF3EA" : "white", color: method === m ? GREEN : TEXT,
              }}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>

        {/* Method-specific inputs */}
        {method === "cash" && (
          <div>
            <Input type="number" placeholder="Cash received" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} style={{ height: 38 }} />
            {cashReceived !== "" && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 13 }}>
                <span style={{ color: MUTED }}>Change</span>
                <span style={{ fontWeight: 700, color: change < 0 ? BROWN : GREEN }}>
                  {change < 0 ? `Short ${ksh(Math.abs(change))}` : ksh(change)}
                </span>
              </div>
            )}
          </div>
        )}
        {method === "mpesa" && (
          <Input placeholder="M-Pesa confirmation code" value={mpesaCode} onChange={(e) => setMpesaCode(e.target.value.toUpperCase())} style={{ height: 38 }} />
        )}
        {method === "card" && (
          <Input placeholder="Card / terminal reference" value={cardRef} onChange={(e) => setCardRef(e.target.value)} style={{ height: 38 }} />
        )}

        <Button
          onClick={completeSale}
          disabled={!canComplete}
          style={{ height: 46, background: canComplete ? GREEN : "#C9C7BF", color: "white", fontSize: 15, fontWeight: 700, gap: 8 }}
        >
          {submitting ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : `Complete Sale · ${ksh(total)}`}
        </Button>

        {lines.length > 0 && (
          <button onClick={resetSale} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
            <X size={13} /> Clear sale
          </button>
        )}
      </div>
    </div>
  )
}

const stepBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6, border: "1px solid #E5E7EB",
  background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: TEXT,
}
