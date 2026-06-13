"use client"

import { Plus, Trash2 } from "lucide-react"

export interface EditLine {
  description: string
  qty: string
  unitPrice: string
  taxRate: string
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

// Editable line-item table for invoices / LPOs. Columns mirror the templates:
// Description, Qty, Unit Price, Taxes(%), Amount. Totals shown below.
export default function DocLineItems({ lines, setLines }: { lines: EditLine[]; setLines: (l: EditLine[]) => void }) {
  const { amounts, subtotal, vat, total } = lineTotals(lines)
  const update = (i: number, patch: Partial<EditLine>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const remove = (i: number) => setLines(lines.filter((_, idx) => idx !== i))

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr style={{ fontSize: 12, color: MUTED, textAlign: "left" }}>
              <th style={{ padding: "4px 8px" }}>Description</th>
              <th style={{ padding: "4px 8px", width: 70 }}>Qty</th>
              <th style={{ padding: "4px 8px", width: 110 }}>Unit Price</th>
              <th style={{ padding: "4px 8px", width: 80 }}>Tax %</th>
              <th style={{ padding: "4px 8px", width: 110, textAlign: "right" }}>Amount</th>
              <th style={{ width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td style={{ padding: 3 }}>
                  <input style={cell} value={l.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="Item / service" />
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
                    <button onClick={() => remove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8C6A4A" }}><Trash2 size={15} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
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
