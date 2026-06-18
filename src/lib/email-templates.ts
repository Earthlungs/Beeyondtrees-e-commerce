const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"
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
    <div style="background:${GREEN};padding:20px 28px;display:flex;align-items:center;gap:10px;">
      <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">🌿 Beeyond Trees</span>
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
    <h2 style="margin:0 0 8px;font-size:18px;color:${GREEN};">✓ LPO Approved</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 12px;">
      LPO <strong>${lpoNumber}</strong> (${supplierName}) for <strong>${ksh(total)}</strong> has been <strong style="color:${GREEN};">fully approved</strong> by ${approvedBy} and is ready to use.
    </p>
    ${btn("View LPO", lpoUrl)}
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
