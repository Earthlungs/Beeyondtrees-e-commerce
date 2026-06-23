"use client"

import { useState } from "react"
import { Download, Printer, Share2, Check } from "lucide-react"

const GREEN = "#6B7D5C"

// Client action bar shown above a public document. Uses only browser-native
// capabilities: print / save-as-PDF via the print dialog, and the OS share sheet
// (with a copy-link fallback). Hidden when the document is printed (.no-print).
export default function PublicDocControls({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  const print = () => window.print()

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    const nav = typeof navigator !== "undefined" ? navigator : undefined
    if (nav?.share) {
      try {
        await nav.share({ title, text: `${title} from Beeyond Trees`, url })
        return
      } catch { /* user cancelled or share failed — fall through to copy */ }
    }
    if (nav?.clipboard) {
      try {
        await nav.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } catch { /* clipboard blocked — nothing else we can do silently */ }
    }
  }

  return (
    <div
      className="no-print"
      style={{
        position: "sticky", top: 0, zIndex: 20, background: "#F5F1EC",
        borderBottom: "1px solid #E4DDD0", padding: "12px 16px",
        display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 13, color: "#6b6353", fontWeight: 600, marginRight: 4 }}>{title}</span>
      <button onClick={print} style={btn(true)}>
        <Download size={16} /> Download PDF
      </button>
      <button onClick={print} style={btn(false)}>
        <Printer size={16} /> Print
      </button>
      <button onClick={share} style={btn(false)}>
        {copied ? <><Check size={16} /> Link copied</> : <><Share2 size={16} /> Share</>}
      </button>
    </div>
  )
}

function btn(primary: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "9px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
    border: `1px solid ${GREEN}`,
    background: primary ? GREEN : "white",
    color: primary ? "white" : GREEN,
  }
}
