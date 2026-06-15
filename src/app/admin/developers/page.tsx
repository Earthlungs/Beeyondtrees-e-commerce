"use client"

import { useState, useEffect } from "react"
import { Code2, Copy, Check, KeyRound, Webhook, Boxes, ShoppingBag, Workflow, MessagesSquare, AlertCircle } from "lucide-react"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const CARD = "var(--admin-card)"
const CARD2 = "var(--admin-card-2)"
const BORDER = "var(--admin-border)"
const GREEN = "#6B7D5C"

const METHOD_COLOR: Record<string, string> = { GET: "#2F80ED", POST: "#27AE60", PUT: "#E2A03F", PATCH: "#9B59B6", DELETE: "#C0392B" }

interface Param { name: string; in: "query" | "body" | "path" | "header"; type: string; required?: boolean; desc: string }
interface Endpoint {
  method: string; path: string; auth: string; desc: string
  params?: Param[]; request?: string; response?: string; notes?: string
}
interface Section { id: string; title: string; icon: typeof Boxes; intro?: string; endpoints: Endpoint[] }

// ── Code block with copy ───────────────────────────────────────────────────
function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ position: "relative", marginTop: 8 }}>
      <button onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
        style={{ position: "absolute", top: 8, right: 8, background: "rgba(127,127,127,0.18)", border: "none", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: MUTED, display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
        {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Copied" : "Copy"}
      </button>
      <pre style={{ background: "#0E0E0E", color: "#E6E6E6", borderRadius: 8, padding: "12px 14px", overflowX: "auto", fontSize: 12.5, lineHeight: 1.55, margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{children}</pre>
    </div>
  )
}

function MethodBadge({ method }: { method: string }) {
  return <span style={{ background: METHOD_COLOR[method] ?? MUTED, color: "white", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, letterSpacing: 0.5, fontFamily: "monospace" }}>{method}</span>
}

function EndpointCard({ e }: { e: Endpoint }) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginBottom: 14, background: CARD }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <MethodBadge method={e.method} />
        <code style={{ fontSize: 14, fontWeight: 600, color: TEXT, fontFamily: "monospace" }}>{e.path}</code>
        <span style={{ marginLeft: "auto", fontSize: 11, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "2px 9px" }}>{e.auth}</span>
      </div>
      <p style={{ fontSize: 13.5, color: TEXT, marginTop: 8 }}>{e.desc}</p>
      {e.params && e.params.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginTop: 10 }}>
          <thead><tr style={{ color: MUTED, textAlign: "left" }}>
            <th style={{ padding: "4px 6px" }}>Field</th><th style={{ padding: "4px 6px" }}>In</th><th style={{ padding: "4px 6px" }}>Type</th><th style={{ padding: "4px 6px" }}>Req</th><th style={{ padding: "4px 6px" }}>Description</th>
          </tr></thead>
          <tbody>
            {e.params.map((p) => (
              <tr key={p.name} style={{ borderTop: `1px solid ${BORDER}` }}>
                <td style={{ padding: "5px 6px" }}><code style={{ color: TEXT }}>{p.name}</code></td>
                <td style={{ padding: "5px 6px", color: MUTED }}>{p.in}</td>
                <td style={{ padding: "5px 6px", color: MUTED }}>{p.type}</td>
                <td style={{ padding: "5px 6px", color: p.required ? "#C0392B" : MUTED }}>{p.required ? "yes" : "—"}</td>
                <td style={{ padding: "5px 6px", color: TEXT }}>{p.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {e.request && <><div style={{ fontSize: 11, color: MUTED, marginTop: 12, fontWeight: 600 }}>EXAMPLE REQUEST</div><Code>{e.request}</Code></>}
      {e.response && <><div style={{ fontSize: 11, color: MUTED, marginTop: 12, fontWeight: 600 }}>EXAMPLE RESPONSE</div><Code>{e.response}</Code></>}
      {e.notes && <p style={{ fontSize: 12, color: MUTED, marginTop: 10, fontStyle: "italic" }}>{e.notes}</p>}
    </div>
  )
}

export default function DevelopersPage() {
  const [origin, setOrigin] = useState("https://your-domain.com")
  useEffect(() => { setOrigin(window.location.origin) }, [])

  const sections: Section[] = [
    {
      id: "catalog", title: "Catalog", icon: Boxes,
      intro: "Public, read-only product catalog — the main surface for syncing BEEyond Trees products into another system (e.g. a marketplace, ERP, or POS). Supports incremental sync via ?since.",
      endpoints: [
        {
          method: "GET", path: "/api/products", auth: "Public",
          desc: "List the full catalog. Prices are per pricing tier (retail / wholesale / distributor). costPrice is never returned publicly.",
          params: [{ name: "since", in: "query", type: "ISO-8601", desc: "Return only products created/updated after this timestamp — fetch just the delta." }],
          request: `curl "${origin}/api/products?since=2026-06-01T00:00:00Z"`,
          response: `[
  {
    "id": "clx...",
    "name": "Macadamia Seedling",
    "description": "...",
    "category": "Seedlings",
    "retailPrice": 250,
    "wholesalePrice": 200,
    "distributorPrice": 170,
    "stock": 480,
    "isOnOffer": false,
    "offerPrice": null,
    "isFeatured": true,
    "images": ["https://res.cloudinary.com/..."],
    "createdAt": "2026-06-01T10:00:00.000Z",
    "updatedAt": "2026-06-10T08:30:00.000Z"
  }
]`,
          notes: "Cached at the edge (~120s). Pass ?since for uncached deltas.",
        },
        {
          method: "GET", path: "/api/products/{id}", auth: "Public",
          desc: "Fetch one product including its full image list.",
          params: [{ name: "id", in: "path", type: "string", required: true, desc: "Product id." }],
          request: `curl "${origin}/api/products/clx123"`,
        },
      ],
    },
    {
      id: "orders", title: "Orders", icon: ShoppingBag,
      intro: "Create orders from an external system, and (with an admin session) read and manage them. Orders carry Kenya-style delivery (county / town / landmark) and snapshot the product name, price and pricing tier at purchase time.",
      endpoints: [
        {
          method: "POST", path: "/api/orders", auth: "Public",
          desc: "Place an order. Server recomputes the total from the items; status starts as \"pending\".",
          params: [
            { name: "customerName", in: "body", type: "string", required: true, desc: "Buyer name." },
            { name: "customerPhone", in: "body", type: "string", required: true, desc: "Buyer phone." },
            { name: "customerEmail", in: "body", type: "string", desc: "Optional email." },
            { name: "county", in: "body", type: "string", required: true, desc: "Delivery county." },
            { name: "town", in: "body", type: "string", required: true, desc: "Delivery town." },
            { name: "landmark", in: "body", type: "string", desc: "Optional landmark." },
            { name: "items", in: "body", type: "array", required: true, desc: "[{ productId, quantity, pricingTier }]" },
          ],
          request: `curl -X POST "${origin}/api/orders" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customerName": "Jane Wanjiku",
    "customerPhone": "0712345678",
    "county": "Nairobi",
    "town": "Karen",
    "items": [
      { "productId": "clx123", "quantity": 12, "pricingTier": "wholesale" }
    ]
  }'`,
          response: `{ "id": "ord_...", "status": "pending", "total": 2400, "items": [ ... ] }`,
          notes: "Pricing tiers enforce minimum quantities: retail ≥1, wholesale ≥12, distributor ≥37.",
        },
        { method: "GET", path: "/api/orders", auth: "Admin session", desc: "List orders (admin/merchant). Returns 401 without a valid session." },
        { method: "GET", path: "/api/orders/{id}", auth: "Admin session", desc: "Fetch one order with its items and dispatch record." },
        { method: "PATCH", path: "/api/orders/{id}", auth: "Admin session", desc: "Update order status (e.g. paid / cancelled / dispatched)." },
        { method: "POST", path: "/api/orders/{id}/dispatch", auth: "Admin session", desc: "Attach a rider dispatch (name, phone, motorbike plate, rider id)." },
      ],
    },
    {
      id: "tracing", title: "Value Chain", icon: Workflow,
      intro: "The 9-stage traceability pipeline (bulk request → … → receiving) and its profit/loss reconciliation. Useful for piping production data into BI / ERP systems.",
      endpoints: [
        { method: "GET", path: "/api/tracing/batches", auth: "Pipeline role / admin", desc: "List all batches with current stage, status and (for completed) a profit/loss summary." },
        { method: "GET", path: "/api/tracing/batches/{id}", auth: "Pipeline role / admin", desc: "Full batch with every stage record." },
        {
          method: "POST", path: "/api/tracing/batches/{id}/stage", auth: "Stage role / admin",
          desc: "Submit the current stage. Enforces the sequential lock (409 if out of order).",
          params: [
            { name: "stage", in: "body", type: "string", required: true, desc: "Stage key (e.g. sourcing, inspection)." },
            { name: "action", in: "body", type: "string", desc: "submit | accept | reject | add | advance." },
            { name: "data", in: "body", type: "object", required: true, desc: "Stage-specific fields." },
          ],
        },
        { method: "GET", path: "/api/tracing/batches/{id}/reconcile", auth: "Pipeline role / admin", desc: "Cost rollup + catalog price match → per-tier margin and loss/profit verdict." },
        { method: "GET", path: "/api/tracing/reports", auth: "Admin / IT", desc: "Aggregate analytics: per-batch P/L, totals over time, cost-by-stage, cycle time." },
      ],
    },
    {
      id: "messaging", title: "Messaging", icon: MessagesSquare,
      intro: "In-app staff messaging. Could back an external notifications/inbox integration.",
      endpoints: [
        { method: "GET", path: "/api/chat", auth: "Any staff session", desc: "List contacts with unread counts. With ?with={userId}, returns that thread and marks it read." },
        { method: "POST", path: "/api/chat", auth: "Any staff session", desc: "Send a direct message: { toUserId, body }." },
        { method: "POST", path: "/api/chat/broadcast", auth: "Admin / IT", desc: "Fan-out one message to many: { toUserIds: string[] | \"all\", body }." },
      ],
    },
    {
      id: "webhooks", title: "Webhooks", icon: Webhook,
      intro: "Inbound webhooks the system consumes. Verify signatures before trusting the payload.",
      endpoints: [
        {
          method: "POST", path: "/api/webhook/paystack", auth: "HMAC signature",
          desc: "Paystack payment events. The raw body is HMAC-SHA512 signed with your secret key and sent as the x-paystack-signature header; the server recomputes and compares before acting on charge.success.",
          params: [{ name: "x-paystack-signature", in: "header", type: "string", required: true, desc: "HMAC-SHA512 of the raw body using PAYSTACK_SECRET_KEY." }],
          request: `POST /api/webhook/paystack
x-paystack-signature: <hmac_sha512_hex>

{ "event": "charge.success", "data": { "reference": "...", "amount": 240000, "status": "success" } }`,
        },
      ],
    },
  ]

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Code2 size={22} color={GREEN} />
        <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Developers — API Reference</h1>
      </div>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 18 }}>Integrate BEEyond Trees with other systems: sync the catalog, push orders, stream value-chain data, and receive payment webhooks.</p>

      {/* Overview cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, marginBottom: 4 }}>BASE URL</div>
          <code style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{origin}/api</code>
          <p style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>All requests and responses are JSON (UTF-8). Send <code>Content-Type: application/json</code> on writes.</p>
        </div>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: MUTED, fontWeight: 600, marginBottom: 6 }}><KeyRound size={13} /> AUTHENTICATION</div>
          <ul style={{ fontSize: 12.5, color: TEXT, paddingLeft: 16, lineHeight: 1.7, margin: 0 }}>
            <li><b>Public</b> — catalog reads &amp; order creation; no auth.</li>
            <li><b>Admin session</b> — staff endpoints use a signed session cookie (sign in at /admin/login).</li>
            <li><b>HMAC</b> — webhooks are signature-verified.</li>
          </ul>
        </div>
      </div>

      {/* Section anchor nav */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} style={{ fontSize: 12.5, color: TEXT, textDecoration: "none", background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "5px 12px", display: "flex", alignItems: "center", gap: 6 }}>
            <s.icon size={13} /> {s.title}
          </a>
        ))}
      </div>

      {sections.map((s) => (
        <section key={s.id} id={s.id} style={{ marginBottom: 28, scrollMarginTop: 70 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <s.icon size={18} color={GREEN} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>{s.title}</h2>
          </div>
          {s.intro && <p style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>{s.intro}</p>}
          {s.endpoints.map((e, i) => <EndpointCard key={i} e={e} />)}
        </section>
      ))}

      {/* Errors */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <AlertCircle size={18} color={GREEN} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>Errors &amp; Status Codes</h2>
        </div>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {[
                ["200 / 201", "Success. Writes return 201."],
                ["400", "Validation error — body explains the problem: { \"error\": \"...\" }"],
                ["401", "Unauthorized — missing/invalid session or signature."],
                ["403", "Forbidden — authenticated but the role isn't allowed."],
                ["404", "Resource not found."],
                ["409", "Conflict — e.g. value-chain stage submitted out of order."],
                ["500", "Server error."],
              ].map(([code, desc]) => (
                <tr key={code} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "8px 6px", width: 90 }}><code style={{ color: TEXT, fontWeight: 600 }}>{code}</code></td>
                  <td style={{ padding: "8px 6px", color: TEXT }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
