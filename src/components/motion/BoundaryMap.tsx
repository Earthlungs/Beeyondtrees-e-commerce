"use client"

import { useMemo } from "react"
import { motion } from "motion/react"
import { Counter } from "@/components/motion/Counter"
import geo from "@/data/coverage-geo.json"

const SAGE = "#6B7D5C"
const DARK = "#4A3F2F"
const SAND = "#C9A24B"

const SHAPES = (geo as { shapes: Record<string, number[][][]> }).shapes
const W = 460, H = 360, PAD = 30

export type MapSite = { name: string; location: string; trees: number }

type Projected = { name: string; role: "focal" | "neighbor"; rings: string[]; cx: number; cy: number }

// Project real lng/lat rings into the SVG box with an equirectangular fit and
// latitude correction (so shapes aren't horizontally stretched near the equator).
function buildProjection(focal: string, neighbors: string[]) {
  const names = [...neighbors, ...(focal ? [focal] : [])].filter((n) => SHAPES[n])
  const all: number[][] = []
  for (const n of names) for (const ring of SHAPES[n]) for (const p of ring) all.push(p)
  if (all.length === 0) return { shapes: [] as Projected[], pin: { x: W / 2, y: H / 2 } }

  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const [lng, lat] of all) {
    if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat
  }
  const meanLatCos = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)
  const worldW = (maxLng - minLng) * meanLatCos || 1
  const worldH = (maxLat - minLat) || 1
  const scale = Math.min((W - 2 * PAD) / worldW, (H - 2 * PAD) / worldH)
  const offX = PAD + ((W - 2 * PAD) - worldW * scale) / 2
  const offY = PAD + ((H - 2 * PAD) - worldH * scale) / 2
  const px = (lng: number) => offX + (lng - minLng) * meanLatCos * scale
  const py = (lat: number) => offY + (maxLat - lat) * scale

  const shapes: Projected[] = names.map((name) => {
    const rings = SHAPES[name].map((ring) => {
      let d = ""
      ring.forEach(([lng, lat], i) => { d += `${i ? "L" : "M"}${px(lng).toFixed(1)},${py(lat).toFixed(1)}` })
      return d + "Z"
    })
    // centroid from the largest ring (for the label / pin)
    const big = SHAPES[name].reduce((a, b) => (a.length >= b.length ? a : b))
    let sx = 0, sy = 0
    for (const [lng, lat] of big) { sx += px(lng); sy += py(lat) }
    return { name, role: name === focal ? "focal" : "neighbor", rings, cx: sx / big.length, cy: sy / big.length }
  })

  const focalShape = shapes.find((s) => s.role === "focal")
  const pin = focalShape ? { x: focalShape.cx, y: focalShape.cy } : { x: W / 2, y: H / 2 }
  // draw neighbours first, focal on top
  shapes.sort((a, b) => (a.role === "focal" ? 1 : 0) - (b.role === "focal" ? 1 : 0))
  return { shapes, pin }
}

export function BoundaryMap({
  focal, neighbors, site, maxTrees,
}: {
  focal: string
  neighbors: string[]
  site: MapSite
  maxTrees: number
}) {
  const { shapes, pin } = useMemo(() => buildProjection(focal, neighbors), [focal, neighbors])
  const ratio = Math.max(0.1, Math.min(1, site.trees / maxTrees))
  const barH = 6 + ratio * 8

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxWidth: 500, margin: "0 auto" }}>
        {shapes.map((s, i) => {
          const isFocal = s.role === "focal"
          return (
            <g key={s.name}>
              {s.rings.map((d, ri) => (
                <motion.path
                  key={ri}
                  d={d}
                  fill={isFocal ? "rgba(107,125,92,0.18)" : "rgba(74,63,47,0.04)"}
                  stroke={isFocal ? SAGE : "#9a8d7d"}
                  strokeWidth={isFocal ? 2.4 : 1.2}
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, fillOpacity: 0 }}
                  animate={{ pathLength: 1, fillOpacity: 1 }}
                  transition={{
                    pathLength: { duration: isFocal ? 1.1 : 0.8, delay: isFocal ? 0.9 : 0.15 + i * 0.13, ease: [0.4, 0, 0.2, 1] },
                    fillOpacity: { duration: 0.6, delay: isFocal ? 1.6 : 0.7 + i * 0.13 },
                  }}
                />
              ))}
              <motion.text
                x={s.cx} y={s.cy} textAnchor="middle" fontSize={isFocal ? 13 : 10.5}
                fontWeight={isFocal ? 700 : 600} fill={isFocal ? DARK : "#8a8170"}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: isFocal ? 1.8 : 0.9 + i * 0.13, duration: 0.4 }}
                style={{ pointerEvents: "none" }}
              >
                {s.name}
              </motion.text>
            </g>
          )
        })}

        {/* focal pin */}
        <motion.circle
          cx={pin.x} cy={pin.y} r={18} fill="none" stroke={SAND} strokeWidth={2}
          animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 1.6 }}
          style={{ transformOrigin: `${pin.x}px ${pin.y}px` }}
        />
        <motion.circle
          cx={pin.x} cy={pin.y} r={7} fill={SAND} stroke="white" strokeWidth={2.5}
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.7, type: "spring", stiffness: 260, damping: 14 }}
        />
      </svg>

      {/* numeric scale bar — length tracks the tree count */}
      <div style={{ maxWidth: 500, margin: "12px auto 0", padding: "0 8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8a8170", fontWeight: 700 }}>Coverage</span>
          <span className="font-display" style={{ fontSize: 22, fontWeight: 600, color: SAGE }}>
            <Counter to={site.trees} /> <span style={{ fontSize: 12, color: "#8a8170", fontWeight: 500 }}>trees</span>
          </span>
        </div>
        <div style={{ height: barH, background: "#E7E1D4", borderRadius: 999, overflow: "hidden" }}>
          <motion.div
            style={{ height: "100%", background: `linear-gradient(90deg, ${SAGE}, ${SAND})`, borderRadius: 999 }}
            initial={{ width: 0 }} animate={{ width: `${ratio * 100}%` }}
            transition={{ delay: 0.6, duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
        <p style={{ fontSize: 10.5, color: "#A89F91", marginTop: 10, textAlign: "right" }}>
          Boundaries ©{" "}
          <a href="https://www.geoboundaries.org" target="_blank" rel="noopener noreferrer"
            style={{ color: "#8a8170", textDecoration: "underline" }}>
            geoBoundaries
          </a>{" "}
          (CC BY 4.0)
        </p>
      </div>
    </div>
  )
}
