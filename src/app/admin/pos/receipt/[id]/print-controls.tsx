"use client"

import Link from "next/link"
import { Printer, Plus } from "lucide-react"

// Print + next-sale controls for the receipt. Hidden from the printout itself
// via the `.no-print` class (see the print stylesheet on the receipt page).
export default function PrintControls() {
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
