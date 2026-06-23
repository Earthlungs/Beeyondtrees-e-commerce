import { sendMail } from "@/lib/mailer"
import {
  invoiceDocEmail,
  lpoDocEmail,
  receiptDocEmail,
  type DocEmailLine,
} from "@/lib/email-templates"
import type { DocLine } from "@/lib/docs"
import { signDoc } from "@/lib/doc-token"

const BASE_URL = process.env.NEXTAUTH_URL || "https://www.beeyondtrees.org"

// Public, login-free link for a document emailed to a client (carries a signed token).
function publicUrl(type: "invoice" | "lpo" | "receipt", id: string): string {
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
    viewUrl: publicUrl("lpo", lpo.id),
  })
  await sendMail({ to, subject: `Purchase Order ${lpo.number} from Beeyond Trees`, html })
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
