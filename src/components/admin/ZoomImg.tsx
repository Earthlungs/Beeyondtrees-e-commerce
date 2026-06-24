"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

// A thumbnail that opens the full image in a fullscreen overlay on click.
// Drop-in replacement for an <img>; pass the same src/alt/style for the thumb.
// eslint-disable-next-line @next/next/no-img-element
export default function ZoomImg({ src, alt = "", style }: { src: string; alt?: string; style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} onClick={() => setOpen(true)} style={{ cursor: "zoom-in", ...style }} />
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 24 }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false) }}
            aria-label="Close"
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 999, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
          >
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
        </div>
      )}
    </>
  )
}
