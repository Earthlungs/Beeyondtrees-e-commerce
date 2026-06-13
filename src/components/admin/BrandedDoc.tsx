import { Globe, Phone, Mail, MapPin } from "lucide-react"

// Branded A4 document shell matching templates/ (Invoice, Purchase Order):
// logo + title + divider header, contact footer with green/tan blocks. Pure
// presentational + server-safe. The print stylesheet hides the admin chrome so
// only #doc prints. Pass the page title (e.g. "INVOICE", "PURCHASE ORDER").
export const DOC_GREEN = "#6B7D5C"
export const DOC_TAN = "#DCC89A"
const TEXT = "#2A2A2A"

export default function BrandedDoc({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #doc, #doc * { visibility: visible !important; }
          #doc { position: absolute; left: 0; top: 0; width: 100%; margin: 0; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 12mm; }
          /* Force background colours (footer blocks, divider) to print/PDF even
             when the user hasn't ticked "Background graphics". */
          #doc, #doc * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div
        id="doc"
        style={{
          width: 800, maxWidth: "100%", background: "white", color: TEXT,
          border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden",
          display: "flex", flexDirection: "column", minHeight: 1040,
          WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
        }}
      >
        {/* Header */}
        <div style={{ padding: "28px 36px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.png" alt="BEEyond Trees" width={48} height={48} style={{ objectFit: "contain" }} />
              <div style={{ lineHeight: 1.1 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: DOC_GREEN }}>BEEyond</div>
                <div style={{ fontSize: 14, color: "#8A8A8A" }}>Trees</div>
              </div>
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 1, color: DOC_GREEN, fontFamily: "Georgia, serif" }}>
              {title}
            </div>
          </div>
          <div style={{ height: 3, marginTop: 14, background: `linear-gradient(90deg, ${DOC_GREEN}, ${DOC_TAN})`, borderRadius: 2 }} />
        </div>

        {/* Body */}
        <div style={{ padding: "24px 36px", flex: 1 }}>{children}</div>

        {/* Footer */}
        <div style={{ position: "relative", marginTop: "auto" }}>
          <div style={{ display: "flex", height: 64 }}>
            <div style={{ flex: "0 0 28%", background: DOC_GREEN }} />
            <div style={{ flex: "0 0 14%", background: DOC_TAN }} />
            <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px", fontSize: 11.5, color: "#3A3A3A", width: "100%" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Globe size={13} color={DOC_GREEN} /> www.beeyondtrees.org</span>
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Phone size={13} color={DOC_GREEN} /> +254 790 279 826</span>
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Mail size={13} color={DOC_GREEN} /> btrees@earthlungs.org</span>
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}><MapPin size={13} color={DOC_GREEN} /> Palm Court, Waiyaki Way</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
