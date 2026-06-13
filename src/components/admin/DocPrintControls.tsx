"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Printer, ArrowLeft } from "lucide-react"

// Print + back controls for branded docs (invoice, LPO, receipt). When the URL
// carries ?print=1 (e.g. straight after creating/completing) it fires the print
// dialog automatically, once. Hidden from the printout via .no-print.
export default function DocPrintControls({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  const params = useSearchParams()
  const printed = useRef(false)

  useEffect(() => {
    if (params.get("print") === "1" && !printed.current) {
      printed.current = true
      const t = setTimeout(() => window.print(), 600) // let the doc paint first
      return () => clearTimeout(t)
    }
  }, [params])

  return (
    <div className="no-print" style={{ display: "flex", gap: 10, justifyContent: "center", margin: "20px 0" }}>
      <button
        onClick={() => window.print()}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, background: "#6B7D5C", color: "white", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
      >
        <Printer size={16} /> Print / Save PDF
      </button>
      <Link
        href={backHref}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, background: "white", color: "#4A3F2F", border: "1px solid #E5E7EB", cursor: "pointer", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
      >
        <ArrowLeft size={16} /> {backLabel}
      </Link>
    </div>
  )
}
