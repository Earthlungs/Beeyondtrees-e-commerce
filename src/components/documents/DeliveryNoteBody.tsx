import { DOC_GREEN } from "@/components/admin/BrandedDoc"
import type { DeliveryLine } from "@/lib/docs"

const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-KE") : "—")
const qty = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })

export interface DeliveryNoteRecord {
  number: string
  lpoNumber: string | null
  deliveryDate: Date
  supplierName: string
  deliveredTo: string | null
  vehicleReg: string | null
  driverName: string | null
  driverPhone: string | null
  receivedBy: string | null
  items: unknown
  notes: string | null
}

// Inner content of the branded DELIVERY NOTE. No prices or totals — this
// document proves what physically arrived, so ordered and delivered quantities
// sit side by side and the page ends in a two-party signature block that gets
// signed on the printed copy.
export default function DeliveryNoteBody({ note }: { note: DeliveryNoteRecord }) {
  const items = (note.items as DeliveryLine[]) ?? []
  const short = items.some((l) => l.qtyOrdered > 0 && l.qtyDelivered < l.qtyOrdered)

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 24px", marginBottom: 24, fontSize: 13 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Delivery Note No.</div>
          <div style={{ color: "#555" }}>{note.number}</div>
          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 12 }}>Supplier</div>
          <div style={{ color: "#555" }}>{note.supplierName}</div>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Delivery Date</div>
          <div style={{ color: "#555" }}>{fmtDate(note.deliveryDate)}</div>
          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 12 }}>Against LPO</div>
          <div style={{ color: "#555" }}>{note.lpoNumber || "—"}</div>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Delivered To</div>
          <div style={{ color: "#555", whiteSpace: "pre-wrap" }}>{note.deliveredTo || "—"}</div>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Vehicle / Registration</div>
          <div style={{ color: "#555" }}>{note.vehicleReg || "—"}</div>
          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 12 }}>Driver</div>
          <div style={{ color: "#555" }}>
            {[note.driverName, note.driverPhone].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${DOC_GREEN}`, textAlign: "left" }}>
            <th style={{ padding: "8px 6px" }}>Description</th>
            <th style={{ padding: "8px 6px", width: 70 }}>Unit</th>
            <th style={{ padding: "8px 6px", width: 80, textAlign: "right" }}>Ordered</th>
            <th style={{ padding: "8px 6px", width: 90, textAlign: "right" }}>Delivered</th>
            <th style={{ padding: "8px 6px", width: 150 }}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {items.map((l, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #EEE" }}>
              <td style={{ padding: "8px 6px" }}>{l.description}</td>
              <td style={{ padding: "8px 6px", color: "#777" }}>{l.unit || "—"}</td>
              <td style={{ padding: "8px 6px", textAlign: "right", color: "#777" }}>{l.qtyOrdered ? qty(l.qtyOrdered) : "—"}</td>
              <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700 }}>{qty(l.qtyDelivered)}</td>
              <td style={{ padding: "8px 6px", color: "#777" }}>{l.remarks || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {short && (
        <div style={{ marginTop: 12, fontSize: 12, color: "#8a6d00" }}>
          Part delivery — one or more items were delivered short of the ordered quantity.
        </div>
      )}

      {note.notes && (
        <div style={{ marginTop: 24, maxWidth: 420 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Notes</div>
          <div style={{ fontSize: 12.5, color: "#555", whiteSpace: "pre-wrap" }}>{note.notes}</div>
        </div>
      )}

      {/* Signed on the printed copy when the goods change hands. */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 44 }}>
        <SignBlock title="Delivered By" name={note.driverName} />
        <SignBlock title="Received By" name={note.receivedBy} />
      </div>
    </>
  )
}

function SignBlock({ title, name }: { title: string; name: string | null }) {
  return (
    <div style={{ fontSize: 12.5 }}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>{title}</div>
      <SignLine label="Name" value={name} />
      <SignLine label="Signature" />
      <SignLine label="Date" />
    </div>
  )
}

function SignLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 16 }}>
      <span style={{ color: "#777", width: 62, flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, borderBottom: "1px solid #BBB", minHeight: 18, color: "#555" }}>{value || ""}</span>
    </div>
  )
}
