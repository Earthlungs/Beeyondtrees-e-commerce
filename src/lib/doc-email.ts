import { sendMail } from "@/lib/mailer"
import {
  deliveryNoteDocEmail,
  invoiceDocEmail,
  lpoDocEmail,
  quotationDocEmail,
  receiptDocEmail,
  type DocEmailLine,
} from "@/lib/email-templates"
import type { DeliveryLine, DocLine } from "@/lib/docs"
import { signDoc } from "@/lib/doc-token"

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.beeyondtrees.org"

// Public, login-free link for a document emailed to a client (carries a signed token).
function publicUrl(type: "invoice" | "lpo" | "receipt" | "quotation" | "delivery-note", id: string): string {
  return `${BASE_URL}/doc/${type}/${id}?t=${signDoc(type, id)}`
}

const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-KE") : ""

// Basic shape check so we never hand nodemailer an obviously bad recipient.
export function isValidEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

function toEmailLines(items: DocLine[]): DocEmailLine[] {
  return items.map((l) => ({
    description: l.description,
    qty: l.qty,
    unitPrice: l.unitPrice,
    taxRate: l.taxRate,
    amount: l.amount,
  }))
}

// Each of these renders the branded HTML document and emails it. They throw on a
// genuine send failure so the caller can log it; callers wrap them in try/catch
// and never let an email failure break the underlying create/approve flow.

export async function sendInvoiceEmail(invoice: {
  id: string; number: string; date: Date; dueDate: Date | null
  customerName: string; customerContact: string | null
  items: unknown; subtotal: number; vat: number; total: number; notes: string | null
}, to: string) {
  const html = invoiceDocEmail({
    number: invoice.number,
    date: fmtDate(invoice.date),
    dueDate: invoice.dueDate ? fmtDate(invoice.dueDate) : null,
    customerName: invoice.customerName,
    customerContact: invoice.customerContact,
    items: toEmailLines((invoice.items as DocLine[]) ?? []),
    subtotal: invoice.subtotal, vat: invoice.vat, total: invoice.total,
    notes: invoice.notes,
    viewUrl: publicUrl("invoice", invoice.id),
  })
  await sendMail({ to, subject: `Invoice ${invoice.number} from Beeyond Trees`, html })
}

export async function sendLpoEmail(lpo: {
  id: string; number: string; orderDate: Date; expectedArrival: Date | null
  supplierName: string; shippingAddress: string | null; purchaseRep: string | null
  destinationOfGoods?: string | null
  items: unknown; subtotal: number; vat: number; total: number; notes: string | null
  paymentDetails?: string | null
}, to: string) {
  const html = lpoDocEmail({
    number: lpo.number,
    orderDate: fmtDate(lpo.orderDate),
    expectedArrival: lpo.expectedArrival ? fmtDate(lpo.expectedArrival) : null,
    supplierName: lpo.supplierName,
    shippingAddress: lpo.shippingAddress,
    purchaseRep: lpo.purchaseRep,
    destinationOfGoods: lpo.destinationOfGoods ?? null,
    items: toEmailLines((lpo.items as DocLine[]) ?? []),
    subtotal: lpo.subtotal, vat: lpo.vat, total: lpo.total,
    notes: lpo.notes,
    paymentDetails: lpo.paymentDetails ?? null,
    viewUrl: publicUrl("lpo", lpo.id),
  })
  await sendMail({ to, subject: `Purchase Order ${lpo.number} from Beeyond Trees`, html })
}

export async function sendQuotationEmail(q: {
  id: string; number: string; orderDate: Date; expectedArrival: Date | null
  supplierName: string; shippingAddress: string | null; purchaseRep: string | null
  destinationOfGoods?: string | null
  items: unknown; subtotal: number; vat: number; total: number
}, to: string) {
  const html = quotationDocEmail({
    number: q.number,
    orderDate: fmtDate(q.orderDate),
    expectedArrival: q.expectedArrival ? fmtDate(q.expectedArrival) : null,
    supplierName: q.supplierName,
    shippingAddress: q.shippingAddress,
    purchaseRep: q.purchaseRep,
    destinationOfGoods: q.destinationOfGoods ?? null,
    items: toEmailLines((q.items as DocLine[]) ?? []),
    subtotal: q.subtotal, vat: q.vat, total: q.total,
    viewUrl: publicUrl("quotation", q.id),
  })
  await sendMail({ to, subject: `Quotation ${q.number} from Beeyond Trees`, html })
}

export async function sendDeliveryNoteEmail(dn: {
  id: string; number: string; lpoNumber: string | null; deliveryDate: Date
  supplierName: string; deliveredTo: string | null; vehicleReg: string | null
  driverName: string | null; driverPhone: string | null; receivedBy: string | null
  items: unknown; notes: string | null
}, to: string) {
  const items = (dn.items as DeliveryLine[]) ?? []
  const html = deliveryNoteDocEmail({
    number: dn.number,
    lpoNumber: dn.lpoNumber,
    deliveryDate: fmtDate(dn.deliveryDate),
    supplierName: dn.supplierName,
    deliveredTo: dn.deliveredTo,
    vehicleReg: dn.vehicleReg,
    driverName: dn.driverName,
    driverPhone: dn.driverPhone,
    receivedBy: dn.receivedBy,
    items: items.map((l) => ({
      description: l.description,
      unit: l.unit,
      qtyOrdered: l.qtyOrdered,
      qtyDelivered: l.qtyDelivered,
      remarks: l.remarks,
    })),
    notes: dn.notes,
    viewUrl: publicUrl("delivery-note", dn.id),
  })
  await sendMail({ to, subject: `Delivery Note ${dn.number} from Beeyond Trees`, html })
}

export async function sendReceiptEmail(order: {
  id: string; createdAt: Date; customerName: string | null; soldBy: string | null
  paymentMethod: string | null; mpesaCode: string | null; cardRef: string | null
  cashReceived: number | null; total: number
  items: { productName: string; price: number; quantity: number; pricingTier: string; subtotal: number }[]
}, to: string) {
  const receiptNo = order.id.slice(-8).toUpperCase()
  const change =
    order.paymentMethod === "cash" && order.cashReceived != null
      ? order.cashReceived - order.total
      : null
  const html = receiptDocEmail({
    receiptNo,
    date: new Date(order.createdAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }),
    customerName: order.customerName,
    soldBy: order.soldBy,
    paymentMethod: order.paymentMethod,
    mpesaCode: order.mpesaCode,
    cardRef: order.cardRef,
    items: order.items.map((it) => ({
      description: it.productName,
      qty: it.quantity,
      unitPrice: it.price,
      tier: it.pricingTier,
      amount: it.subtotal,
    })),
    total: order.total,
    cashReceived: order.cashReceived,
    change,
    viewUrl: publicUrl("receipt", order.id),
  })
  await sendMail({ to, subject: `Receipt ${receiptNo} — Beeyond Trees`, html })
}
