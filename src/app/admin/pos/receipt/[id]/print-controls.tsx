"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Printer, Plus } from "lucide-react"

// Print + next-sale controls for the receipt. Hidden from the printout itself
// via the `.no-print` class (see the print stylesheet on the receipt page).
// When opened with ?print=1 (straight after completing a sale) the receipt is
// generated automatically — the print dialog fires once on load.
export default function PrintControls() {
  const params = useSearchParams()
  const printed = useRef(false)

  useEffect(() => {
    if (params.get("print") === "1" && !printed.current) {
      printed.current = true
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [params])

  return (
    <div className="no-print" style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
      <button
        onClick={() => window.print()}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8,
          background: "#6B7D5C", color: "white", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
        }}
      >
        <Printer size={16} /> Print receipt
      </button>
      <Link
        href="/admin/pos"
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8,
          background: "white", color: "#4A3F2F", border: "1px solid #E5E7EB", cursor: "pointer",
          fontSize: 14, fontWeight: 600, textDecoration: "none",
        }}
      >
        <Plus size={16} /> New sale
      </Link>
    </div>
  )
}
