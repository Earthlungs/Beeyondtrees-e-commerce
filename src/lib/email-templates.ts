const BASE_URL = process.env.NEXTAUTH_URL || "https://www.beeyondtrees.org"
const LOGO_URL = `${BASE_URL}/icons/icon-192.png`
const GREEN = "#6B7D5C"
const RED = "#C0392B"
const BROWN = "#8C6A4A"

function layout(body: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F1EC;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:${GREEN};padding:16px 28px;display:flex;align-items:center;gap:12px;">
      <img src="${LOGO_URL}" alt="Beeyond Trees" width="44" height="44" style="width:44px;height:44px;object-fit:contain;border-radius:10px;flex-shrink:0;background:#ffffff;padding:4px;" />
      <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Beeyond Trees</span>
    </div>
    <div style="padding:28px;">
      ${body}
    </div>
    <div style="padding:16px 28px;background:#F5F1EC;font-size:11px;color:#999;text-align:center;">
      This is an automated notification from the Beeyond Trees operations system.
    </div>
  </div>
</body>
</html>`
}

function btn(label: string, url: string, color = GREEN) {
  return `<a href="${url}" style="display:inline-block;margin-top:16px;padding:10px 22px;background:${color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${label}</a>`
}

function ksh(n: number) { return `KSh ${n.toLocaleString()}` }

// ─── Tracing ────────────────────────────────────────────────────────────────

export function stageAdvanceEmail({
  batchCode, productName, stageName, roleName, batchUrl,
}: {
  batchCode: string; productName: string; stageName: string; roleName: string; batchUrl: string
}) {
  return layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#1a1a1a;">Action Required: ${stageName}</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Batch <strong>${batchCode}</strong> (${productName || "—"}) has advanced and is now waiting on <strong>${roleName}</strong>.
    </p>
    <p style="color:#555;font-size:14px;margin:0;">Please log in and complete your stage to keep the pipeline moving.</p>
    ${btn("Open Batch →", batchUrl)}
  `)
}

export function batchApprovedEmail({
  batchCode, productName, approvedBy, batchUrl,
}: {
  batchCode: string; productName: string; approvedBy: string; batchUrl: string
}) {
  return layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:${GREEN};">✓ Batch Approved</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Your bulk request <strong>${batchCode}</strong> (${productName || "—"}) has been <strong style="color:${GREEN};">approved</strong> by ${approvedBy}.
      The batch is now moving to the Sourcing stage.
    </p>
    ${btn("View Batch", batchUrl)}
  `)
}

export function batchRejectedEmail({
  batchCode, productName, approvedBy, reason, batchUrl,
}: {
  batchCode: string; productName: string; approvedBy: string; reason: string; batchUrl: string
}) {
  return layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:${RED};">✗ Batch Rejected</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 12px;">
      Your bulk request <strong>${batchCode}</strong> (${productName || "—"}) was <strong style="color:${RED};">rejected</strong> by ${approvedBy}.
    </p>
    ${reason ? `<div style="background:#FDEDED;border-left:4px solid ${RED};padding:10px 14px;border-radius:4px;font-size:14px;color:#333;margin-bottom:8px;"><strong>Reason:</strong> ${reason}</div>` : ""}
    ${btn("View Batch", batchUrl, RED)}
  `)
}

export function batchCompletedEmail({
  batchCode, productName, batchUrl,
}: {
  batchCode: string; productName: string; batchUrl: string
}) {
  return layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:${GREEN};">🎉 Batch Completed</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Batch <strong>${batchCode}</strong> (${productName || "—"}) has completed all 9 stages and is now ready for reconciliation.
    </p>
    ${btn("View Reconciliation", batchUrl)}
  `)
}

// ─── LPO ────────────────────────────────────────────────────────────────────

export function lpoApprovedEmail({
  lpoNumber, supplierName, total, approvedBy, lpoUrl,
}: {
  lpoNumber: string; supplierName: string; total: number; approvedBy: string; lpoUrl: string
}) {
  return layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:${GREEN};">✓ LPO Fully Approved</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 12px;">
      LPO <strong>${lpoNumber}</strong> (${supplierName}) for <strong>${ksh(total)}</strong> has been <strong style="color:${GREEN};">fully approved</strong> by ${approvedBy}.
      You can now create a production batch linked to this LPO.
    </p>
    ${btn("Create Batch →", lpoUrl)}
  `)
}

export function lpoExecApprovedEmail({
  lpoNumber, supplierName, total, approvedBy, lpoUrl,
}: {
  lpoNumber: string; supplierName: string; total: number; approvedBy: string; lpoUrl: string
}) {
  return layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:${BROWN};">LPO Executive Approval</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 12px;">
      LPO <strong>${lpoNumber}</strong> (${supplierName}) for <strong>${ksh(total)}</strong> has been approved by the executive <strong>${approvedBy}</strong> and is awaiting final admin approval.
    </p>
    ${btn("Review & Approve", lpoUrl, BROWN)}
  `)
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export function newOrderEmail({
  orderRef, customerName, customerPhone, town, county, total, ordersUrl,
}: {
  orderRef: string; customerName: string; customerPhone: string
  town: string; county: string; total: number; ordersUrl: string
}) {
  return layout(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#1a1a1a;">🛒 New Order Received</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
      <tr><td style="padding:5px 0;color:#888;width:140px;">Reference</td><td style="padding:5px 0;font-weight:600;color:#1a1a1a;">${orderRef}</td></tr>
      <tr><td style="padding:5px 0;color:#888;">Customer</td><td style="padding:5px 0;color:#1a1a1a;">${customerName}</td></tr>
      <tr><td style="padding:5px 0;color:#888;">Phone</td><td style="padding:5px 0;color:#1a1a1a;">${customerPhone}</td></tr>
      <tr><td style="padding:5px 0;color:#888;">Location</td><td style="padding:5px 0;color:#1a1a1a;">${town}, ${county}</td></tr>
      <tr><td style="padding:5px 0;color:#888;">Total</td><td style="padding:5px 0;font-weight:700;color:${GREEN};">${ksh(total)}</td></tr>
    </table>
    ${btn("View Order", ordersUrl)}
  `)
}

// ─── Branded documents (LPO / Invoice / Receipt) ─────────────────────────────
// Email-safe HTML renderings of the printable BrandedDoc. Tables + inline styles
// only (no flexbox / <style>) so Gmail/Outlook render them faithfully. Mirrors
// the brand: green header + green→tan footer with the same contacts as
// src/components/admin/BrandedDoc.tsx.

const TAN = "#DCC89A"

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export interface DocEmailLine {
  description: string
  qty: number
  unitPrice: number
  taxRate?: number
  tier?: string
  amount: number
}

// Outer shell: green brand header, white doc card with title + number, then the
// green/tan contact footer. `body` is the inner doc content (meta + items + totals).
function docLayout({ title, docNumber, body, viewUrl, viewLabel }: {
  title: string; docNumber: string; body: string; viewUrl?: string; viewLabel?: string
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F1EC;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
    <!-- Brand header -->
    <table role="presentation" width="100%" style="border-collapse:collapse;">
      <tr>
        <td style="padding:22px 32px;vertical-align:middle;">
          <img src="${LOGO_URL}" alt="Beeyond Trees" width="44" height="44" style="vertical-align:middle;width:44px;height:44px;object-fit:contain;border-radius:10px;background:#fff;padding:3px;border:1px solid #eee;" />
          <span style="font-size:20px;font-weight:700;color:${GREEN};vertical-align:middle;margin-left:10px;font-family:Georgia,serif;">BEEyond Trees</span>
        </td>
        <td style="padding:22px 32px;text-align:right;vertical-align:middle;">
          <div style="font-size:26px;font-weight:800;letter-spacing:1px;color:${GREEN};">${esc(title)}</div>
          <div style="font-size:13px;color:#888;margin-top:2px;">${esc(docNumber)}</div>
        </td>
      </tr>
    </table>
    <div style="height:3px;background:linear-gradient(90deg, ${GREEN}, ${TAN});"></div>

    <!-- Document body -->
    <div style="padding:24px 32px;color:#2A2A2A;">
      ${body}
      ${viewUrl ? `<div style="margin-top:24px;">${btn(viewLabel || "View / Print Document →", viewUrl)}</div>` : ""}
    </div>

    <!-- Contact footer -->
    <table role="presentation" width="100%" style="border-collapse:collapse;">
      <tr>
        <td width="28%" style="background:${GREEN};height:56px;"></td>
        <td width="14%" style="background:${TAN};height:56px;"></td>
        <td style="padding:10px 24px;font-size:11.5px;color:#3A3A3A;font-family:system-ui,sans-serif;">
          <div>www.beeyondtrees.org &nbsp;·&nbsp; +254 790 279 826</div>
          <div>btrees@earthlungs.org &nbsp;·&nbsp; Palm Court, Waiyaki Way</div>
        </td>
      </tr>
    </table>
  </div>
  <div style="max-width:640px;margin:8px auto 24px;text-align:center;font-size:11px;color:#aaa;font-family:system-ui,sans-serif;">
    This document was sent to you by the Beeyond Trees operations system.
  </div>
</body>
</html>`
}

function metaGrid(rows: { label: string; value: string }[]): string {
  return `<table role="presentation" width="100%" style="border-collapse:collapse;font-size:13px;font-family:system-ui,sans-serif;margin:0 0 22px;">
    ${rows.map((r) => `<tr>
      <td style="padding:4px 0;color:#888;width:170px;vertical-align:top;">${esc(r.label)}</td>
      <td style="padding:4px 0;color:#1a1a1a;font-weight:600;">${esc(r.value) || "—"}</td>
    </tr>`).join("")}
  </table>`
}

// Renders the line-item table. `variant` picks the 4th column: "tax" (LPO/Invoice)
// shows the tax %, "tier" (Receipt) shows the pricing tier.
function lineItemsTable(items: DocEmailLine[], variant: "tax" | "tier"): string {
  const fourth = variant === "tax" ? "Taxes" : "Tier"
  return `<table role="presentation" width="100%" style="border-collapse:collapse;font-size:13px;font-family:system-ui,sans-serif;">
    <tr style="text-align:left;">
      <th style="padding:8px 6px;border-bottom:2px solid ${GREEN};">${variant === "tier" ? "Item" : "Description"}</th>
      <th style="padding:8px 6px;border-bottom:2px solid ${GREEN};width:50px;">Qty</th>
      <th style="padding:8px 6px;border-bottom:2px solid ${GREEN};width:100px;">Unit Price</th>
      <th style="padding:8px 6px;border-bottom:2px solid ${GREEN};width:70px;">${fourth}</th>
      <th style="padding:8px 6px;border-bottom:2px solid ${GREEN};width:110px;text-align:right;">Amount</th>
    </tr>
    ${items.map((l) => `<tr>
      <td style="padding:8px 6px;border-bottom:1px solid #EEE;">${esc(l.description)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #EEE;">${esc(l.qty)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #EEE;">${ksh(l.unitPrice)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #EEE;text-transform:capitalize;color:#777;">${variant === "tax" ? (l.taxRate ? `${l.taxRate}%` : "—") : esc(l.tier || "—")}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #EEE;text-align:right;">${ksh(l.amount)}</td>
    </tr>`).join("")}
  </table>`
}

function totalsBlock(rows: { label: string; value: string; bold?: boolean }[]): string {
  return `<table role="presentation" align="right" style="border-collapse:collapse;font-size:14px;font-family:system-ui,sans-serif;margin-top:20px;width:260px;">
    ${rows.map((r) => `<tr>
      <td style="padding:4px 0;font-weight:${r.bold ? 800 : 600};font-size:${r.bold ? 16 : 14}px;${r.bold ? `border-top:2px solid ${GREEN};` : ""}">${esc(r.label)}</td>
      <td style="padding:4px 0;text-align:right;font-weight:${r.bold ? 800 : 600};font-size:${r.bold ? 16 : 14}px;${r.bold ? `border-top:2px solid ${GREEN};` : ""}">${esc(r.value)}</td>
    </tr>`).join("")}
  </table>
  <div style="clear:both;"></div>`
}

function notesBlock(label: string, notes?: string | null): string {
  if (!notes) return ""
  return `<div style="margin-top:24px;font-family:system-ui,sans-serif;">
    <div style="font-weight:800;font-size:13px;color:#1a1a1a;margin-bottom:4px;">${esc(label)}</div>
    <div style="font-size:12.5px;color:#555;white-space:pre-wrap;">${esc(notes)}</div>
  </div>`
}

export function invoiceDocEmail({
  number, date, dueDate, customerName, customerContact, items, subtotal, vat, total, notes, viewUrl,
}: {
  number: string; date: string; dueDate: string | null; customerName: string
  customerContact: string | null; items: DocEmailLine[]
  subtotal: number; vat: number; total: number; notes: string | null; viewUrl?: string
}) {
  const body = `
    ${metaGrid([
      { label: "Bill To", value: customerName },
      { label: "Contact", value: customerContact || "" },
      { label: "Invoice Date", value: date },
      { label: "Due Date", value: dueDate || "" },
    ])}
    ${lineItemsTable(items, "tax")}
    ${totalsBlock([
      { label: "Subtotal", value: ksh(subtotal) },
      { label: "VAT", value: ksh(vat) },
      { label: "Total", value: ksh(total), bold: true },
    ])}
    ${notesBlock("Payment Details", notes)}
  `
  return docLayout({ title: "INVOICE", docNumber: number, body, viewUrl })
}

export function lpoDocEmail({
  number, orderDate, expectedArrival, supplierName, shippingAddress, purchaseRep,
  destinationOfGoods, items, subtotal, vat, total, notes, viewUrl,
}: {
  number: string; orderDate: string; expectedArrival: string | null; supplierName: string
  shippingAddress: string | null; purchaseRep: string | null; destinationOfGoods: string | null
  items: DocEmailLine[]; subtotal: number; vat: number; total: number; notes: string | null; viewUrl?: string
}) {
  const body = `
    ${metaGrid([
      { label: "Supplier", value: supplierName },
      { label: "Shipping Address", value: shippingAddress || "" },
      { label: "Purchase Representative", value: purchaseRep || "" },
      { label: "Order Date", value: orderDate },
      { label: "Expected Arrival", value: expectedArrival || "" },
      ...(destinationOfGoods ? [{ label: "Destination of Goods", value: destinationOfGoods }] : []),
    ])}
    ${lineItemsTable(items, "tax")}
    ${totalsBlock([
      { label: "Amount", value: ksh(subtotal) },
      { label: "VAT", value: ksh(vat) },
      { label: "Total", value: ksh(total), bold: true },
    ])}
    ${notesBlock("Payment Details", notes)}
  `
  return docLayout({ title: "PURCHASE ORDER", docNumber: number, body, viewUrl, viewLabel: "View / Print LPO →" })
}

export function receiptDocEmail({
  receiptNo, date, customerName, soldBy, paymentMethod, mpesaCode, cardRef,
  items, total, cashReceived, change, viewUrl,
}: {
  receiptNo: string; date: string; customerName: string | null; soldBy: string | null
  paymentMethod: string | null; mpesaCode: string | null; cardRef: string | null
  items: DocEmailLine[]; total: number; cashReceived: number | null; change: number | null; viewUrl?: string
}) {
  const methodLabel: Record<string, string> = { cash: "Cash", mpesa: "M-Pesa", card: "Card" }
  const totals: { label: string; value: string; bold?: boolean }[] = [{ label: "Total", value: ksh(total), bold: true }]
  if (cashReceived != null) {
    totals.push({ label: "Cash received", value: ksh(cashReceived) })
    if (change != null) totals.push({ label: "Change", value: ksh(change) })
  }
  const body = `
    ${metaGrid([
      { label: "Received from", value: customerName && customerName !== "Walk-in customer" ? customerName : "Walk-in customer" },
      { label: "Receipt No", value: receiptNo },
      { label: "Date", value: date },
      ...(soldBy ? [{ label: "Served by", value: soldBy }] : []),
      { label: "Payment Method", value: `${methodLabel[paymentMethod ?? ""] ?? paymentMethod ?? "—"}${paymentMethod === "mpesa" && mpesaCode ? ` (${mpesaCode})` : paymentMethod === "card" && cardRef ? ` (${cardRef})` : ""}` },
    ])}
    ${lineItemsTable(items, "tier")}
    ${totalsBlock(totals)}
    <div style="margin-top:24px;text-align:center;font-size:12px;color:#888;font-family:system-ui,sans-serif;">Asante sana! Thank you for shopping with us.</div>
  `
  return docLayout({ title: "RECEIPT", docNumber: `No. ${receiptNo}`, body, viewUrl, viewLabel: "View Receipt →" })
}
