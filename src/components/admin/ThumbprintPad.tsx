"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Fingerprint, Loader2, RotateCcw, Check, X, Camera } from "lucide-react"

const GREEN = "#6B7D5C"
const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const CARD = "var(--admin-card)"
const BORDER = "1px solid var(--admin-border)"

const PAD_W = 340
const PAD_H = 260

// Captures the FARMER's thumbprint as an image, to be stamped into the
// contract's footer.
//
// Two ways in, because field conditions vary:
//   · Press pad — the farmer presses and rolls their thumb on the touchscreen.
//     Pressure/size drives the stroke width so it reads as a thumb mark rather
//     than a pen line.
//   · Photo — a picture of an inked thumbprint on paper, which is what many
//     farmers will already have put on the physical agreement.
//
// This is an evidentiary mark, not a biometric scan: no browser can read a real
// fingerprint sensor, so nothing here extracts or matches minutiae.
export default function ThumbprintPad({
  farmerName, onCancel, onCaptured,
}: {
  farmerName: string
  onCancel: () => void
  onCaptured: (dataUrl: string, signerName: string) => Promise<void> | void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const ctx = () => {
    const c = canvasRef.current
    if (!c) return null
    const g = c.getContext("2d")
    if (g && !g.getTransform().a) g.scale(1, 1)
    return g
  }

  const paint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const c = canvasRef.current
    const g = ctx()
    if (!c || !g) return
    const r = c.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * c.width
    const y = ((e.clientY - r.top) / r.height) * c.height
    // A finger reports a contact area; a mouse does not. Either way we want a
    // broad, soft mark rather than a hairline.
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5
    const radius = 9 + pressure * 16

    const grad = g.createRadialGradient(x, y, 0, x, y, radius)
    grad.addColorStop(0, "rgba(20,20,20,0.85)")
    grad.addColorStop(0.6, "rgba(20,20,20,0.45)")
    grad.addColorStop(1, "rgba(20,20,20,0)")
    g.fillStyle = grad
    g.beginPath()
    g.arc(x, y, radius, 0, Math.PI * 2)
    g.fill()
    setDirty(true)
  }

  const clear = () => {
    const c = canvasRef.current
    const g = ctx()
    if (!c || !g) return
    g.clearRect(0, 0, c.width, c.height)
    setDirty(false)
    setError("")
  }

  const loadPhoto = (file: File) => {
    setError("")
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const c = canvasRef.current
        const g = ctx()
        if (!c || !g) return
        g.clearRect(0, 0, c.width, c.height)
        // Fit the photo inside the pad without distorting it.
        const scale = Math.min(c.width / img.width, c.height / img.height)
        const w = img.width * scale
        const h = img.height * scale
        g.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h)
        setDirty(true)
      }
      img.onerror = () => setError("That image could not be read.")
      img.src = String(reader.result)
    }
    reader.onerror = () => setError("That image could not be read.")
    reader.readAsDataURL(file)
  }

  const save = async () => {
    const c = canvasRef.current
    if (!c || !dirty) { setError("Capture the thumbprint first."); return }
    setSaving(true); setError("")
    try {
      await onCaptured(c.toDataURL("image/png"), farmerName)
    } catch (e) {
      setError((e as Error)?.message || "Could not save the thumbprint.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: CARD, borderRadius: 14, width: "100%", maxWidth: 420, overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: BORDER }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Fingerprint size={18} color={GREEN} />
            <span style={{ fontWeight: 700, color: TEXT, fontSize: 15 }}>Thumbprint signature</span>
          </div>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 18 }}>
          <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 12px", lineHeight: 1.5 }}>
            Ask <strong style={{ color: TEXT }}>{farmerName}</strong> to press and roll their thumb inside the box —
            or attach a photo of their inked thumbprint. The mark is stamped into the contract footer.
          </p>

          {error && (
            <div style={{ background: "#FDEDED", color: "#C0392B", padding: "8px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 10 }}>
              {error}
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={PAD_W}
            height={PAD_H}
            onPointerDown={(e) => {
              (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
              drawing.current = true
              paint(e)
            }}
            onPointerMove={paint}
            onPointerUp={() => { drawing.current = false }}
            onPointerLeave={() => { drawing.current = false }}
            style={{
              width: "100%", aspectRatio: `${PAD_W} / ${PAD_H}`, display: "block",
              border: `2px dashed ${GREEN}`, borderRadius: 10, background: "#FCFCFA",
              touchAction: "none", cursor: "crosshair",
            }}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <Button onClick={clear} disabled={saving} style={{ background: CARD, color: TEXT, border: BORDER, gap: 6, height: 36, fontSize: 12.5 }}>
              <RotateCcw size={14} /> Clear
            </Button>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 12px", border: BORDER, borderRadius: 8, fontSize: 12.5, color: TEXT, cursor: saving ? "default" : "pointer" }}>
              <Camera size={14} color={GREEN} /> Photo instead
              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={saving}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) loadPhoto(f); e.target.value = "" }}
                style={{ display: "none" }}
              />
            </label>
            <Button
              onClick={save}
              disabled={saving || !dirty}
              style={{ background: GREEN, color: "white", gap: 6, height: 36, fontSize: 12.5, marginLeft: "auto" }}
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save thumbprint</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
