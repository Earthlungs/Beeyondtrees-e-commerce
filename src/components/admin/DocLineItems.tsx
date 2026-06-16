"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Trash2, PackageSearch, X, Search } from "lucide-react"
import Image from "next/image"

export interface EditLine {
  description: string
  qty: string
  unitPrice: string
  taxRate: string
  productId?: string
  imageUrl?: string
}

export const emptyLine = (): EditLine => ({ description: "", qty: "1", unitPrice: "", taxRate: "0" })

const ksh = (n: number) => `KSh ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const TEXT = "#4A3F2F"
const MUTED = "#A89F91"
const GREEN = "#6B7D5C"

export function lineTotals(lines: EditLine[]) {
  const amounts = lines.map((l) => (Number(l.qty) || 0) * (Number(l.unitPrice) || 0))
  const subtotal = amounts.reduce((s, a) => s + a, 0)
  const vat = lines.reduce((s, l, i) => s + (amounts[i] * (Number(l.taxRate) || 0)) / 100, 0)
  return { amounts, subtotal, vat, total: subtotal + vat }
}

const cell: React.CSSProperties = { padding: "6px 8px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 13, width: "100%", background: "white" }

interface CatalogProduct {
  id: string
  name: string
  retailPrice: number
  images: string[]
  updatedAt: string
}

function productThumb(p: CatalogProduct): string | null {
  const first = p.images[0]
  if (first && /^https?:\/\//.test(first)) return `${first}?v=${p.updatedAt}`
  return null
}

export default function DocLineItems({ lines, setLines }: { lines: EditLine[]; setLines: (l: EditLine[]) => void }) {
  const { amounts, subtotal, vat, total } = lineTotals(lines)
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [pickerFor, setPickerFor] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: CatalogProduct[]) => setProducts(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (pickerFor === null) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerFor(null)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [pickerFor])

  const update = (i: number, patch: Partial<EditLine>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const remove = (i: number) => setLines(lines.filter((_, idx) => idx !== i))

  const pickProduct = (lineIndex: number, p: CatalogProduct) => {
    update(lineIndex, { description: p.name, unitPrice: String(p.retailPrice), productId: p.id, imageUrl: productThumb(p) ?? undefined })
    setPickerFor(null)
    setSearch("")
  }

  const filtered = search.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products

  return (
    <div>
      {pickerFor !== null && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "15vh" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) { setPickerFor(null); setSearch("") } }}>
          <div ref={pickerRef} style={{ background: "white", borderRadius: 12, width: "min(520px, 95vw)", maxHeight: "65vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #eee", display: "flex", gap: 8, alignItems: "center" }}>
              <Search size={15} color={MUTED} style={{ flexShrink: 0 }} />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: TEXT }}
              />
              <button type="button" onClick={() => { setPickerFor(null); setSearch("") }} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {filtered.length === 0 ? (
                <p style={{ padding: "20px 16px", color: MUTED, fontSize: 13, textAlign: "center" }}>No products found.</p>
              ) : (
                filtered.map((p) => {
                  const thumb = productThumb(p)
                  return (
                    <button key={p.id} type="button" onClick={() => pickProduct(pickerFor!, p)}
                      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: "1px solid #f5f5f5" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fdf8")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                      <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: "#f0ede8", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {thumb ? (
                          <Image src={thumb} alt={p.name} width={44} height={44} style={{ objectFit: "cover", width: "100%", height: "100%" }} unoptimized />
                        ) : (
                          <PackageSearch size={18} color={MUTED} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{ksh(p.retailPrice)}</div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
          <thead>
            <tr style={{ fontSize: 12, color: MUTED, textAlign: "left" }}>
              <th style={{ padding: "4px 8px", minWidth: 140 }}>Description</th>
              <th style={{ padding: "4px 8px", width: 60 }}>Qty</th>
              <th style={{ padding: "4px 8px", width: 100 }}>Unit Price</th>
              <th style={{ padding: "4px 8px", width: 60 }}>Tax %</th>
              <th style={{ padding: "4px 8px", width: 100, textAlign: "right" }}>Amount</th>
              <th style={{ width: 28 }} />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td style={{ padding: 3 }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <button
                      type="button"
                      title="Pick from product catalog"
                      onClick={() => { setPickerFor(i); setSearch("") }}
                      style={{ flexShrink: 0, background: pickerFor === i ? GREEN : "#F0EDE8", border: "none", borderRadius: 6, cursor: "pointer", padding: "0 7px", height: 32, display: "flex", alignItems: "center" }}>
                      <PackageSearch size={13} color={pickerFor === i ? "white" : GREEN} />
                    </button>
                    {l.imageUrl && (
                      <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 6, overflow: "hidden", border: "1px solid #E5E7EB" }}>
                        <Image src={l.imageUrl} alt={l.description} width={32} height={32} style={{ objectFit: "cover", width: "100%", height: "100%" }} unoptimized />
                      </div>
                    )}
                    <input style={{ ...cell, flex: 1 }} value={l.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="Item / service" />
                  </div>
                </td>
                <td style={{ padding: 3 }}>
                  <input style={cell} type="number" min="0" value={l.qty} onChange={(e) => update(i, { qty: e.target.value })} />
                </td>
                <td style={{ padding: 3 }}>
                  <input style={cell} type="number" min="0" value={l.unitPrice} onChange={(e) => update(i, { unitPrice: e.target.value })} />
                </td>
                <td style={{ padding: 3 }}>
                  <input style={cell} type="number" min="0" value={l.taxRate} onChange={(e) => update(i, { taxRate: e.target.value })} />
                </td>
                <td style={{ padding: "3px 8px", textAlign: "right", fontSize: 13, fontWeight: 600, color: TEXT }}>{ksh(amounts[i] || 0)}</td>
                <td style={{ textAlign: "center" }}>
                  {lines.length > 1 && (
                    <button type="button" onClick={() => remove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8C6A4A" }}><Trash2 size={15} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => setLines([...lines, emptyLine()])}
        style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${GREEN}`, color: GREEN, borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
      >
        <Plus size={14} /> Add line
      </button>

      <div style={{ marginTop: 14, marginLeft: "auto", width: 240, fontSize: 13.5 }}>
        <Row label="Amount" value={ksh(subtotal)} />
        <Row label="VAT" value={ksh(vat)} />
        <div style={{ borderTop: "1px solid #E5E7EB", margin: "6px 0" }} />
        <Row label="Total" value={ksh(total)} bold />
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontWeight: bold ? 800 : 400, color: bold ? "#2A2A2A" : "#4A3F2F", fontSize: bold ? 15 : 13.5 }}>
      <span>{label}</span><span>{value}</span>
    </div>
  )
}
