"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search, Plus, Minus, Trash2, ShoppingCart, X,
  Banknote, Smartphone, CreditCard, AlertTriangle, Loader2, CheckCircle2, Tag,
} from "lucide-react"
import { useProductStore, productImageUrl, fuzzyMatch, type Product } from "@/store/product-store"
import { SuccessModal } from "@/components/admin/ConfirmModal"

type Tier = "retail" | "wholesale" | "distributor"
type Method = "cash" | "mpesa" | "card"

interface Line {
  productId: string
  name: string
  tier: Tier
  quantity: number
  stock: number
  prices: { retail: number; wholesale: number; distributor: number }
  discount: number // KSh off the marked unit price (entered at the till)
  updatedAt?: string
}

const DARK = "#3D3226"
const GREEN = "#6B7D5C"
const CREAM = "var(--admin-bg)"
const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const BROWN = "#8C6A4A"

const ksh = (n: number | null | undefined) => `KSh ${(Number(n) || 0).toLocaleString()}`
const markedPrice = (l: Pick<Line, "prices" | "tier">) => l.prices[l.tier]
// Actual price charged per unit after the till discount (never below 0).
const soldPrice = (l: Pick<Line, "prices" | "tier" | "discount">) => Math.max(0, markedPrice(l) - (l.discount || 0))
const keyOf = (productId: string, tier: Tier) => `${productId}::${tier}`

export default function PosPage() {
  const router = useRouter()
  const { products, loadProducts, loading } = useProductStore()
  const [query, setQuery] = useState("")
  const [lines, setLines] = useState<Line[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [method, setMethod] = useState<Method | null>(null)
  const [cashReceived, setCashReceived] = useState("")
  const [mpesaCode, setMpesaCode] = useState("")
  const [mpesaPhone, setMpesaPhone] = useState("")
  // M-Pesa STK-push flow: idle → sending (calling Paystack) → waiting (STK on the
  // customer's phone, polling) → done (code captured) → failed.
  const [mpesaStatus, setMpesaStatus] = useState<"idle" | "sending" | "waiting" | "done" | "failed">("idle")
  const [mpesaMsg, setMpesaMsg] = useState("")
  const [cardRef, setCardRef] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<{ text: string; tone: "error" | "success" } | null>(null)
  const [saleSuccess, setSaleSuccess] = useState<{ id: string; receiptNo: string; emailed: boolean } | null>(null)

  useEffect(() => { loadProducts() }, [])
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 3500)
    return () => clearTimeout(t)
  }, [notice])

  // Match on name OR SKU — SKUs live inside the product name, e.g.
  // "THE TERRA DOT (BYT-CLY-PLN-007-S)", so a substring search covers both.
  const results = useMemo(() => {
    // Drop any malformed/duplicate cached entries (missing id/name/price) so a
    // bad row can't crash the till; then fuzzy-search.
    const valid = Array.from(
      new Map(
        products
          .filter((p) => p && p.id && p.name != null && p.retailPrice != null)
          .map((p) => [p.id, p])
      ).values()
    )
    const list = query.trim()
      ? valid.filter((p) => fuzzyMatch(query, `${p.name} ${p.category ?? ""}`))
      : valid
    return list.slice(0, 60)
  }, [products, query])

  const total = useMemo(() => lines.reduce((s, l) => s + soldPrice(l) * l.quantity, 0), [lines])
  const totalSaved = useMemo(() => lines.reduce((s, l) => s + Math.min(l.discount || 0, markedPrice(l)) * l.quantity, 0), [lines])
  const itemCount = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines])

  const addProduct = (p: Product) => {
    if (p.stock <= 0) return
    setLines((prev) => {
      const k = keyOf(p.id, "retail")
      const existing = prev.find((l) => keyOf(l.productId, l.tier) === k)
      if (existing) {
        return prev.map((l) =>
          keyOf(l.productId, l.tier) === k ? { ...l, quantity: Math.min(l.quantity + 1, l.stock) } : l
        )
      }
      return [
        ...prev,
        {
          productId: p.id, name: p.name, tier: "retail", quantity: 1, stock: p.stock,
          prices: { retail: p.retailPrice, wholesale: p.wholesalePrice, distributor: p.distributorPrice },
          discount: 0,
          updatedAt: p.updatedAt,
        },
      ]
    })
    setNotice({ text: `Added ${p.name}`, tone: "success" })
  }

  const setQty = (k: string, qty: number) =>
    setLines((prev) => prev.map((l) => (keyOf(l.productId, l.tier) === k ? { ...l, quantity: Math.max(1, Math.min(qty, l.stock)) } : l)))

  const setTier = (k: string, tier: Tier) =>
    setLines((prev) => {
      const line = prev.find((l) => keyOf(l.productId, l.tier) === k)
      if (!line) return prev
      const targetKey = keyOf(line.productId, tier)
      const target = prev.find((l) => keyOf(l.productId, l.tier) === targetKey && l !== line)
      if (target) {
        return prev.filter((l) => l !== line).map((l) => (l === target ? { ...l, quantity: Math.min(l.quantity + line.quantity, l.stock) } : l))
      }
      return prev.map((l) => (l === line ? { ...l, tier } : l))
    })

  // Per-unit discount in KSh, clamped to [0, marked price] so the line can't go negative.
  const setDiscount = (k: string, value: number) =>
    setLines((prev) => prev.map((l) => (keyOf(l.productId, l.tier) === k
      ? { ...l, discount: Math.max(0, Math.min(Number.isFinite(value) ? value : 0, markedPrice(l))) }
      : l)))

  const removeLine = (k: string) => setLines((prev) => prev.filter((l) => keyOf(l.productId, l.tier) !== k))

  const resetSale = () => {
    setLines([]); setMethod(null); setCashReceived(""); setMpesaCode("")
    setMpesaPhone(""); setMpesaStatus("idle"); setMpesaMsg("")
    setCardRef(""); setCustomerName(""); setCustomerPhone(""); setCustomerEmail(""); setCartOpen(false)
  }

  const change = method === "cash" && cashReceived ? Number(cashReceived) - total : 0
  // Accept Safaricom 07xx / 01xx in any common format (0…, 254…, +254…).
  const mpesaReady = /^(?:\+?254|0)?(7|1)\d{8}$/.test(mpesaPhone.replace(/\s/g, ""))
  const canComplete = lines.length > 0 && !!method && !submitting
    && (method !== "cash" || Number(cashReceived) >= total)
    && (method !== "mpesa" || mpesaReady || !!mpesaCode)

  // Record the paid sale and finish (shared by all payment methods).
  const recordSale = async (mpesaCodeFinal: string | null) => {
    const res = await fetch("/api/pos/sale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, pricingTier: l.tier, discount: l.discount || 0 })),
        paymentMethod: method,
        customerName: customerName || null,
        customerPhone: customerPhone || mpesaPhone || null,
        customerEmail: customerEmail || null,
        cashReceived: method === "cash" ? Number(cashReceived) : null,
        mpesaCode: method === "mpesa" ? mpesaCodeFinal : null,
        cardRef: method === "card" ? cardRef : null,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      if (res.status === 409 && Array.isArray(data.items)) {
        const detail = data.items.map((i: { productName: string; available: number }) => `${i.productName} (${i.available} left)`).join(", ")
        setNotice({ text: `Not enough stock: ${detail}. Please adjust quantities.`, tone: "error" })
        loadProducts(true)
      } else {
        setNotice({ text: data.error || "Could not complete the sale.", tone: "error" })
      }
      return
    }
    loadProducts(true)
    resetSale()
    setSaleSuccess({ id: data.id, receiptNo: String(data.id).slice(-8).toUpperCase(), emailed: !!data.emailed })
  }

  // M-Pesa: prompt the customer via Paystack STK push, poll until they pay, then
  // capture the confirmation code and record the sale automatically.
  const runMpesaCharge = async () => {
    setMpesaStatus("sending"); setMpesaMsg("Sending prompt…"); setNotice(null)
    try {
      const cRes = await fetch("/api/pos/mpesa/charge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total, phone: mpesaPhone, email: customerEmail || null }),
      })
      const c = await cRes.json()
      if (!cRes.ok) { setMpesaStatus("failed"); setMpesaMsg(c.error || "Could not start the M-Pesa prompt."); return }
      const reference: string = c.reference
      setMpesaStatus("waiting"); setMpesaMsg(c.display_text || `Prompt sent to ${mpesaPhone} — ask the customer to enter their M-Pesa PIN.`)

      // Poll for up to ~2 minutes.
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 3000))
        const vRes = await fetch("/api/pos/mpesa/verify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        })
        const v = await vRes.json()
        if (v.status === "success") {
          setMpesaCode(v.code || reference); setMpesaStatus("done"); setMpesaMsg(`Confirmed: ${v.code || reference}`)
          await recordSale(v.code || reference)
          return
        }
        if (v.status === "failed" || v.status === "abandoned") {
          setMpesaStatus("failed"); setMpesaMsg("Payment was declined or cancelled on the phone."); return
        }
      }
      setMpesaStatus("failed"); setMpesaMsg("Timed out waiting for the customer. You can retry, or enter the code manually.")
    } catch {
      setMpesaStatus("failed"); setMpesaMsg("Network error reaching the payment provider.")
    }
  }

  const completeSale = async () => {
    if (!canComplete || !method) return
    // M-Pesa with no code yet → run the STK-push flow (which records the sale on success).
    if (method === "mpesa" && !mpesaCode) { setSubmitting(true); try { await runMpesaCharge() } finally { setSubmitting(false) } return }
    setSubmitting(true); setNotice(null)
    try {
      await recordSale(method === "mpesa" ? mpesaCode : null)
    } catch {
      setNotice({ text: "Network error — sale not recorded. Try again.", tone: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ paddingBottom: lines.length ? 90 : 0 }}>
      {/* Toast (fixed, visible over grid and modal) */}
      {notice && (
        <div style={{
          position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 70,
          display: "flex", gap: 8, alignItems: "center", padding: "10px 16px", borderRadius: 10,
          background: notice.tone === "error" ? "#FBEAEA" : "#EAF3EA",
          color: notice.tone === "error" ? "#9B2C2C" : "#2F5D2F", fontSize: 13, fontWeight: 500,
          boxShadow: "0 6px 20px rgba(0,0,0,0.12)", maxWidth: "90vw",
        }}>
          {notice.tone === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{notice.text}</span>
        </div>
      )}

      <SuccessModal
        open={!!saleSuccess}
        title="Sale completed"
        message={saleSuccess?.emailed
          ? `Receipt ${saleSuccess?.receiptNo} saved and emailed to the customer. You can print it now or close this.`
          : `Receipt ${saleSuccess?.receiptNo} saved. You can print it now or close this.`}
        primaryLabel="View / Print receipt"
        onPrimary={() => { if (saleSuccess) router.push(`/admin/pos/receipt/${saleSuccess.id}?print=1`) }}
        onClose={() => setSaleSuccess(null)}
      />

      {/* Header + search */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <ShoppingCart size={22} color={GREEN} />
        <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Point of Sale</h1>
      </div>
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 520 }}>
        <Search size={18} color={MUTED} style={{ position: "absolute", left: 12, top: 11 }} />
        <Input autoFocus placeholder="Search by name, SKU or category…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 38, height: 42, fontSize: 15 }} />
      </div>

      {/* Full-width product grid */}
      {loading && products.length === 0 ? (
        <p style={{ color: MUTED, padding: 20 }}>Loading products…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
          {results.map((p) => {
            const out = p.stock <= 0
            return (
              <button key={p.id} onClick={() => addProduct(p)} disabled={out} style={{
                textAlign: "left", background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 10,
                cursor: out ? "not-allowed" : "pointer", opacity: out ? 0.5 : 1, display: "flex", flexDirection: "column", gap: 6,
              }}>
                <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 8, overflow: "hidden", background: CREAM, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={productImageUrl(p, 0, 500)} alt={p.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden" }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, lineHeight: 1.25, minHeight: 30 }}>{p.name}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>{ksh(p.retailPrice)}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: out ? BROWN : p.stock <= 5 ? "#E6A817" : MUTED }}>{out ? "Out" : `${p.stock} left`}</span>
                </div>
              </button>
            )
          })}
          {results.length === 0 && <p style={{ color: MUTED, gridColumn: "1 / -1", padding: 20 }}>No products match “{query}”.</p>}
        </div>
      )}

      {/* Floating checkout bar — always visible, opens the cart popup (no scrolling) */}
      {lines.length > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)} style={{
          position: "fixed", left: "50%", bottom: 18, transform: "translateX(-50%)", zIndex: 60,
          display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderRadius: 999,
          background: GREEN, color: "white", border: "none", cursor: "pointer",
          boxShadow: "0 8px 24px rgba(107,125,92,0.45)", fontSize: 15, fontWeight: 700, maxWidth: "94vw",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShoppingCart size={18} />
            <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: 999, padding: "1px 9px", fontSize: 13 }}>{itemCount}</span>
          </span>
          <span>{ksh(total)}</span>
          <span style={{ opacity: 0.85 }}>· Complete Sale →</span>
        </button>
      )}

      {/* Cart / checkout popup */}
      {cartOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 65, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={() => setCartOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <div style={{
            position: "relative", zIndex: 1, background: "var(--admin-card)", borderRadius: 16, width: 420, maxWidth: "100%",
            maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid var(--admin-border)" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>Current Sale</span>
              <button onClick={() => setCartOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED }}><X size={20} /></button>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
              {lines.length === 0 ? (
                <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: "20px 0" }}>Cart is empty.</p>
              ) : (
                lines.map((l) => {
                  const k = keyOf(l.productId, l.tier)
                  return (
                    <div key={k} style={{ borderBottom: "1px solid var(--admin-border)", paddingBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, lineHeight: 1.3 }}>{l.name}</span>
                        <button onClick={() => removeLine(k)} style={{ background: "none", border: "none", cursor: "pointer", color: BROWN, flexShrink: 0 }}><Trash2 size={15} /></button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 8 }}>
                        <select value={l.tier} onChange={(e) => setTier(k, e.target.value as Tier)} style={{ fontSize: 12, padding: "5px 6px", borderRadius: 6, border: "1px solid var(--admin-border)", color: TEXT, background: CREAM }}>
                          <option value="retail">Retail · {ksh(l.prices.retail)}</option>
                          <option value="wholesale">Wholesale · {ksh(l.prices.wholesale)}</option>
                          <option value="distributor">Distributor · {ksh(l.prices.distributor)}</option>
                        </select>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button onClick={() => setQty(k, l.quantity - 1)} style={stepBtn}><Minus size={13} /></button>
                          <span style={{ minWidth: 22, textAlign: "center", fontSize: 14, fontWeight: 600 }}>{l.quantity}</span>
                          <button onClick={() => setQty(k, l.quantity + 1)} disabled={l.quantity >= l.stock} style={stepBtn}><Plus size={13} /></button>
                        </div>
                      </div>
                      {/* Per-unit discount in KSh off the marked price */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 8 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: MUTED }}>
                          <Tag size={13} /> Discount / unit
                          <Input
                            type="number" min={0} max={markedPrice(l)} value={l.discount ? String(l.discount) : ""}
                            placeholder="0"
                            onChange={(e) => setDiscount(k, e.target.value === "" ? 0 : Number(e.target.value))}
                            style={{ width: 76, height: 30, fontSize: 12.5, padding: "0 8px" }}
                          />
                        </label>
                        {l.discount > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: BROWN, background: "#F6EEE6", borderRadius: 6, padding: "2px 7px" }}>
                            −{Math.round((Math.min(l.discount, markedPrice(l)) / (markedPrice(l) || 1)) * 100)}%
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: GREEN, marginTop: 6 }}>
                        {l.discount > 0 && (
                          <span style={{ fontSize: 11.5, color: MUTED, fontWeight: 500, textDecoration: "line-through", marginRight: 8 }}>
                            {ksh(markedPrice(l) * l.quantity)}
                          </span>
                        )}
                        {ksh(soldPrice(l) * l.quantity)}
                      </div>
                    </div>
                  )
                })
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <Input placeholder="Customer name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ fontSize: 12.5, height: 36 }} />
                <Input placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={{ fontSize: 12.5, height: 36 }} />
                <Input type="email" placeholder="Email (emails receipt)" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} style={{ fontSize: 12.5, height: 36 }} />
              </div>

              {/* Payment method */}
              <div style={{ display: "flex", gap: 8 }}>
                {([
                  { m: "cash" as Method, label: "Cash", Icon: Banknote },
                  { m: "mpesa" as Method, label: "M-Pesa", Icon: Smartphone },
                  { m: "card" as Method, label: "Card", Icon: CreditCard },
                ]).map(({ m, label, Icon }) => (
                  <button key={m} onClick={() => setMethod(m)} style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px",
                    borderRadius: 8, cursor: "pointer", fontSize: 11.5, fontWeight: 600,
                    border: method === m ? `2px solid ${GREEN}` : "1px solid var(--admin-border)",
                    background: method === m ? "#EAF3EA" : "white", color: method === m ? GREEN : TEXT,
                  }}>
                    <Icon size={18} /> {label}
                  </button>
                ))}
              </div>

              {method === "cash" && (
                <div>
                  <Input type="number" placeholder="Cash received" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} style={{ height: 38 }} />
                  {cashReceived !== "" && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 13 }}>
                      <span style={{ color: MUTED }}>Change</span>
                      <span style={{ fontWeight: 700, color: change < 0 ? BROWN : GREEN }}>{change < 0 ? `Short ${ksh(Math.abs(change))}` : ksh(change)}</span>
                    </div>
                  )}
                </div>
              )}
              {method === "mpesa" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Input
                    placeholder="M-Pesa phone (e.g. 0712345678)"
                    value={mpesaPhone}
                    onChange={(e) => { setMpesaPhone(e.target.value); if (mpesaStatus !== "idle") { setMpesaStatus("idle"); setMpesaMsg("") } }}
                    disabled={mpesaStatus === "sending" || mpesaStatus === "waiting" || mpesaStatus === "done"}
                    style={{ height: 38 }}
                  />
                  {mpesaMsg && (
                    <div style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, color: mpesaStatus === "done" ? GREEN : mpesaStatus === "failed" ? BROWN : "#8a6d00" }}>
                      {(mpesaStatus === "sending" || mpesaStatus === "waiting") && <Loader2 size={13} className="animate-spin" />}
                      {mpesaStatus === "done" && <CheckCircle2 size={13} />}
                      {mpesaMsg}
                    </div>
                  )}
                  {mpesaStatus === "failed" && (
                    <button onClick={() => { setMpesaStatus("idle"); setMpesaMsg("") }} style={{ alignSelf: "flex-start", background: "none", border: "none", color: GREEN, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
                      Enter M-Pesa code manually instead
                    </button>
                  )}
                  {mpesaStatus === "idle" && mpesaMsg === "" && mpesaCode === "" && (
                    <Input placeholder="…or paste M-Pesa code manually" value={mpesaCode} onChange={(e) => setMpesaCode(e.target.value.toUpperCase())} style={{ height: 36, fontSize: 12.5 }} />
                  )}
                </div>
              )}
              {method === "card" && <Input placeholder="Card / terminal reference" value={cardRef} onChange={(e) => setCardRef(e.target.value)} style={{ height: 38 }} />}
            </div>

            {/* Pinned footer — total + complete, no scrolling needed */}
            <div style={{ borderTop: "1px solid var(--admin-border)", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              {totalSaved > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, color: BROWN }}><Tag size={13} /> Discount</span>
                  <span style={{ fontWeight: 700, color: BROWN }}>− {ksh(totalSaved)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, color: TEXT }}>Total</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: DARK }}>{ksh(total)}</span>
              </div>
              <Button onClick={completeSale} disabled={!canComplete} style={{ height: 48, background: canComplete ? GREEN : "#C9C7BF", color: "white", fontSize: 16, fontWeight: 700, gap: 8 }}>
                {submitting
                  ? <><Loader2 size={16} className="animate-spin" /> {method === "mpesa" && mpesaStatus === "waiting" ? "Waiting for M-Pesa…" : "Processing…"}</>
                  : method === "mpesa" && !mpesaCode ? `Send M-Pesa prompt · ${ksh(total)}` : `Complete Sale · ${ksh(total)}`}
              </Button>
              <button onClick={resetSale} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                <X size={13} /> Clear sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const stepBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6, border: "1px solid var(--admin-border)",
  background: "var(--admin-card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: TEXT,
}
