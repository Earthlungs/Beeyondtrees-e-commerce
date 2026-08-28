"use client"

import { useState } from "react"
import { MapPin, X, ExternalLink } from "lucide-react"
import {
  staticMapUrl, osmUrl, googleMapsUrl, formatCoords,
} from "@/lib/geo"

const GREEN = "#6B7D5C"
const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"

export interface Fix {
  latitude: number
  longitude: number
  address?: string | null
  accuracy?: number | null
}

// Compact table cell: the reverse-geocoded address (falling back to raw
// coordinates) plus a "View on map" trigger that opens the full pin.
export function LocationCell({ fix, title }: { fix: Fix; title?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        <MapPin size={14} color={GREEN} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.35 }}>
            {fix.address || formatCoords(fix)}
          </div>
          <button
            onClick={() => setOpen(true)}
            style={{ background: "none", border: "none", padding: 0, marginTop: 2, color: GREEN, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            View on map
          </button>
        </div>
      </div>
      {open && <LocationModal fix={fix} title={title} onClose={() => setOpen(false)} />}
    </>
  )
}

export function LocationModal({ fix, title, onClose }: { fix: Fix; title?: string; onClose: () => void }) {
  const img = staticMapUrl({ latitude: fix.latitude, longitude: fix.longitude, width: 640, height: 340 })
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--admin-card)", borderRadius: 14, width: "100%", maxWidth: 660, overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--admin-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <MapPin size={18} color={GREEN} />
            <span style={{ fontWeight: 700, color: TEXT, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {title || "Location"}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        <MapImage img={img} fix={fix} />

        <div style={{ padding: "14px 18px", fontSize: 13, color: TEXT, lineHeight: 1.6 }}>
          {fix.address && <div style={{ marginBottom: 4 }}>{fix.address}</div>}
          <div style={{ color: MUTED, fontSize: 12.5 }}>
            {formatCoords(fix)}
            {typeof fix.accuracy === "number" && ` · accurate to ~${Math.round(fix.accuracy)} m`}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
            <a href={googleMapsUrl(fix)} target="_blank" rel="noopener noreferrer" style={linkStyle}>
              Google Maps <ExternalLink size={12} />
            </a>
            <a href={osmUrl(fix)} target="_blank" rel="noopener noreferrer" style={linkStyle}>
              OpenStreetMap <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mapbox static image when a token is configured; otherwise a plain placeholder
// — the punch is still fully usable via the coordinates and the two map links.
function MapImage({ img, fix }: { img: string; fix: Fix }) {
  if (!img) {
    return (
      <div style={{ background: "var(--admin-card-2)", padding: "34px 18px", textAlign: "center", color: MUTED, fontSize: 13 }}>
        <MapPin size={26} color={GREEN} style={{ margin: "0 auto 8px" }} />
        <div style={{ fontWeight: 600, color: TEXT, marginBottom: 4 }}>{formatCoords(fix)}</div>
        <div style={{ fontSize: 12 }}>
          Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> to show the map here. The links below work either way.
        </div>
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={img} alt="Map of the recorded location" style={{ width: "100%", display: "block", background: "var(--admin-card-2)" }} />
  )
}

const linkStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  color: GREEN, fontWeight: 600, fontSize: 12.5, textDecoration: "none",
}
