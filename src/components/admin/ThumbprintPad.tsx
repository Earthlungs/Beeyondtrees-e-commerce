"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Fingerprint, Loader2, RotateCcw, Check, X, Camera, Info } from "lucide-react"
import { extractInkPrint, inkCoverage } from "@/lib/inkprint"

const GREEN = "#6B7D5C"
const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const CARD = "var(--admin-card)"
const BORDER = "1px solid var(--admin-border)"

const PAD_W = 480
const PAD_H = 360
// The placement oval, in canvas coordinates — roughly thumb-shaped and sized
// for an adult thumb pad on a phone screen.
const OVAL = { cx: PAD_W / 2, cy: PAD_H / 2, rx: 88, ry: 116 }

// Short, firm haptics. Android fires these; iOS Safari ignores navigator.vibrate
// entirely, so the visual confirmation below never depends on it.
function buzz(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern) } catch { /* unsupported — visual only */ }
}

// Captures the FARMER's thumbprint for the contract footer.
//
// The real path is an INKED print: the farmer presses an inked thumb onto the
// agreement (or any white paper), and the officer photographs it. The photo is
// cleaned to crisp black-on-white — real ridges, that farmer's own.
//
// The screen pad is a fallback for when there is no ink to hand. It records the
// shape and pressure of a thumb pressed on glass; a touchscreen cannot sense
// ridges, so it produces an impression, not a ridge pattern. It is deliberately
// NOT dressed up to look like a fingerprint — a synthetic ridge pattern on a
// land agreement would read as biometric evidence while being invented.
export default function ThumbprintPad({
  farmerName, onCancel, onCaptured,
}: {
  farmerName: string
  onCancel: () => void
  onCaptured: (dataUrl: string, signerName: string) => Promise<void> | void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const buzzed = useRef(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [note, setNote] = useState("")
  const [mode, setMode] = useState<"none" | "ink" | "press">("none")

  const ctx = () => canvasRef.current?.getContext("2d") ?? null

  const reset = () => {
    const c = canvasRef.current
    const g = ctx()
    if (!c || !g) return
    g.clearRect(0, 0, c.width, c.height)
    buzzed.current = false
    setDirty(false); setError(""); setNote(""); setMode("none")
  }

  // Fires once per capture, when a usable mark first exists.
  const confirmCapture = () => {
    if (buzzed.current) return
    buzzed.current = true
    buzz([70, 45, 160]) // firm double-tap: "got it"
  }

  // ── Inked print photographed on paper ────────────────────────────────────
  const loadPhoto = (file: File) => {
    setError(""); setNote(""); setBusy(true)
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        try {
          const print = extractInkPrint(img)
          const coverage = inkCoverage(print)

          if (print.width < 2 || coverage < 0.02) {
            setError("No thumbprint found in that photo. Ink the thumb well, press it on plain white paper, and fill the frame with the print.")
            setBusy(false)
            return
          }
          if (coverage > 0.72) {
            setError("That came out almost solid black — usually too much ink, or a shadow across the paper. Re-ink lightly and shoot in even light.")
            setBusy(false)
            return
          }

          const c = canvasRef.current
          const g = ctx()
          if (!c || !g) { setBusy(false); return }
          g.fillStyle = "#FFFFFF"
          g.fillRect(0, 0, c.width, c.height)
          const scale = Math.min(c.width / print.width, c.height / print.height) * 0.92
          const dw = print.width * scale
          const dh = print.height * scale
          g.drawImage(print, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh)

          setMode("ink")
          setDirty(true)
          buzzed.current = false
          confirmCapture()
          setNote(
            coverage < 0.06
              ? "Captured — faint. If the ridges look broken, re-ink and retake."
              : "Inked print captured — these ridges are this farmer's own."
          )
        } catch {
          setError("That image could not be processed. Try another photo.")
        }
        setBusy(false)
      }
      img.onerror = () => { setError("That image could not be read."); setBusy(false) }
      img.src = String(reader.result)
    }
    reader.onerror = () => { setError("That image could not be read."); setBusy(false) }
    reader.readAsDataURL(file)
  }

  // ── Fallback: thumb pressed on the screen ────────────────────────────────
  const paint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || mode === "ink") return
    const c = canvasRef.current
    const g = ctx()
    if (!c || !g) return
    if (mode !== "press") {
      g.fillStyle = "#FFFFFF"
      g.fillRect(0, 0, c.width, c.height)
      setMode("press")
      setNote("Screen impression — shape and pressure only, not ridges. An inked print photographed on paper is stronger evidence.")
    }
    const r = c.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * c.width
    const y = ((e.clientY - r.top) / r.height) * c.height
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5
    const radius = 10 + pressure * 18

    const grad = g.createRadialGradient(x, y, 0, x, y, radius)
    grad.addColorStop(0, "rgba(18,18,18,0.9)")
    grad.addColorStop(0.65, "rgba(18,18,18,0.5)")
    grad.addColorStop(1, "rgba(18,18,18,0)")
    g.fillStyle = grad
    g.beginPath()
    g.arc(x, y, radius, 0, Math.PI * 2)
    g.fill()
    setDirty(true)
  }

  const save = async () => {
    const c = canvasRef.current
    if (!c || !dirty) { setError("Capture the thumbprint first."); return }
    setSaving(true); setError("")
    try {
      await onCaptured(c.toDataURL("image/png"), farmerName)
      buzz([40, 30, 40])
    } catch (e) {
      setError((e as Error)?.message || "Could not save the thumbprint.")
    } finally {
      setSaving(false)
    }
  }

  const showGuide = mode !== "ink" && !busy
  const showHint = !dirty && !busy

  return (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <style>{`
        @keyframes bt-press {
          0%, 100% { transform: translate(-50%, -50%) scale(1);    opacity: .9; }
          50%      { transform: translate(-50%, -50%) scale(.78);  opacity: 1; }
        }
        @keyframes bt-ripple {
          0%   { transform: translate(-50%, -50%) scale(.55); opacity: .5; }
          70%  { transform: translate(-50%, -50%) scale(1.25); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes bt-oval {
          0%, 100% { opacity: .45; }
          50%      { opacity: .9; }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: CARD, borderRadius: 14, width: "100%", maxWidth: 460, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}
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
          <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 12px", lineHeight: 1.55 }}>
            Ink <strong style={{ color: TEXT }}>{farmerName}</strong>&apos;s thumb, press it on white paper, and photograph it.
            The photo is cleaned to a black-on-white print and stamped into the contract footer.
          </p>

          {error && (
            <div style={{ background: "#FDEDED", color: "#C0392B", padding: "8px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 10, lineHeight: 1.5 }}>
              {error}
            </div>
          )}
          {!error && note && (
            <div style={{ display: "flex", gap: 7, background: "var(--admin-card-2)", color: MUTED, padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
              <Info size={14} color={GREEN} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{note}</span>
            </div>
          )}

          <div style={{ position: "relative" }}>
            <canvas
              ref={canvasRef}
              width={PAD_W}
              height={PAD_H}
              onPointerDown={(e) => {
                if (mode === "ink") return
                ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
                drawing.current = true
                buzz(18) // light tick the moment the thumb lands
                paint(e)
              }}
              onPointerMove={paint}
              onPointerUp={() => {
                drawing.current = false
                if (dirty && mode === "press") confirmCapture()
              }}
              onPointerLeave={() => { drawing.current = false }}
              style={{
                width: "100%", aspectRatio: `${PAD_W} / ${PAD_H}`, display: "block",
                border: `2px solid ${dirty ? GREEN : "var(--admin-border)"}`, borderRadius: 10,
                background: "#FFFFFF", touchAction: "none",
                cursor: mode === "ink" ? "default" : "crosshair",
              }}
            />

            {/* Placement guide + animated finger hint. Drawn OVER the canvas, so
                none of it ends up in the saved image. */}
            {showGuide && (
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <svg viewBox={`0 0 ${PAD_W} ${PAD_H}`} style={{ width: "100%", height: "100%", display: "block" }}>
                  <ellipse
                    cx={OVAL.cx} cy={OVAL.cy} rx={OVAL.rx} ry={OVAL.ry}
                    fill="none" stroke={GREEN} strokeWidth={2.5} strokeDasharray="9 8"
                    style={showHint ? { animation: "bt-oval 2s ease-in-out infinite" } : { opacity: 0.35 }}
                  />
                </svg>

                {showHint && (
                  <>
                    <span
                      style={{
                        position: "absolute", left: "50%", top: "50%",
                        width: 150, height: 190, borderRadius: "50%",
                        border: `2px solid ${GREEN}`,
                        animation: "bt-ripple 2s ease-out infinite",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute", left: "50%", top: "50%",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                        animation: "bt-press 2s ease-in-out infinite",
                      }}
                    >
                      <Fingerprint size={54} color={GREEN} strokeWidth={1.4} />
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: GREEN, whiteSpace: "nowrap" }}>
                        Place thumb here
                      </span>
                    </span>
                  </>
                )}
              </div>
            )}

            {busy && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.8)", borderRadius: 10, fontSize: 12.5, color: TEXT, gap: 8 }}>
                <Loader2 size={16} className="animate-spin" /> Cleaning up the print…
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: "white", background: GREEN, cursor: saving || busy ? "default" : "pointer", opacity: saving || busy ? 0.6 : 1 }}>
              <Camera size={14} /> {mode === "ink" ? "Retake photo" : "Photograph print"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={saving || busy}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) loadPhoto(f); e.target.value = "" }}
                style={{ display: "none" }}
              />
            </label>
            <Button onClick={reset} disabled={saving || busy || !dirty} style={{ background: CARD, color: TEXT, border: BORDER, gap: 6, height: 36, fontSize: 12.5 }}>
              <RotateCcw size={14} /> Clear
            </Button>
            <Button
              onClick={save}
              disabled={saving || busy || !dirty}
              style={{ background: dirty ? GREEN : CARD, color: dirty ? "white" : MUTED, border: dirty ? "none" : BORDER, gap: 6, height: 36, fontSize: 12.5, marginLeft: "auto" }}
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save thumbprint</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
