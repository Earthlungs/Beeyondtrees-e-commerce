"use client"

import { motion } from "motion/react"
import { Counter } from "@/components/motion/Counter"

export type Neighbor = { name: string; dir: keyof typeof DIRS }
export type MapSite = {
  name: string
  location: string
  trees: number
  neighbors: Neighbor[]
}

// Unit vectors per compass direction (SVG y grows downward).
const DIRS = {
  N: [0, -1], NE: [0.72, -0.72], E: [1, 0], SE: [0.72, 0.72],
  S: [0, 1], SW: [-0.72, 0.72], W: [-1, 0], NW: [-0.72, -0.72],
} as const

const SAGE = "#6B7D5C"
const DARK = "#4A3F2F"
const SAND = "#C9A24B"

const CX = 210, CY = 165
const RX = 158, RY = 116

// A wobbly, hand-drawn region outline centred on the site.
const REGION_PATH =
  "M70,150 C72,96 130,60 200,58 C268,56 330,86 348,140 C360,178 344,232 286,262 " +
  "C236,288 150,286 104,256 C66,232 68,196 70,150 Z"

function drawTransition(delay: number, duration = 0.9) {
  return { duration, delay, ease: [0.4, 0, 0.2, 1] as const }
}

export function SketchMap({ site, maxTrees }: { site: MapSite; maxTrees: number }) {
  const ratio = Math.max(0.12, Math.min(1, site.trees / maxTrees))
  // Coverage radiating lines — reach + thickness scale with tree count, so a
  // 4M-tree site visibly draws longer/heavier lines than a 1M-tree site.
  const reach = 46 + ratio * 96      // 46 → 142 px
  const coverW = 2.5 + ratio * 8     // 2.5 → 10.5 px stroke
  const coverAngles = [-58, -20, 18, 58, 100, 150, 200, 250]

  return (
    <div>
      <svg viewBox="0 0 420 330" width="100%" style={{ display: "block", maxWidth: 460, margin: "0 auto" }}>
        {/* sketch region outline */}
        <motion.path
          d={REGION_PATH} fill="rgba(107,125,92,0.06)" stroke={SAGE} strokeWidth={2.2}
          strokeLinecap="round" strokeDasharray="1 5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={drawTransition(0.1, 1.3)}
        />

        {/* coverage radiating lines (scaled to trees) */}
        {coverAngles.map((deg, i) => {
          const rad = (deg * Math.PI) / 180
          const x2 = CX + Math.cos(rad) * reach
          const y2 = CY + Math.sin(rad) * reach
          return (
            <motion.line
              key={deg} x1={CX} y1={CY} x2={x2} y2={y2}
              stroke={SAGE} strokeWidth={coverW} strokeLinecap="round" opacity={0.5}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={drawTransition(0.5 + i * 0.06, 0.6)}
            />
          )
        })}

        {/* neighbour connectors + nodes + labels */}
        {site.neighbors.map((n, i) => {
          const [ux, uy] = DIRS[n.dir]
          const nx = CX + ux * RX
          const ny = CY + uy * RY
          const isOcean = /ocean/i.test(n.name)
          const anchor = ux > 0.3 ? "start" : ux < -0.3 ? "end" : "middle"
          const lx = nx + ux * 10
          const ly = ny + uy * 6 + (Math.abs(uy) < 0.3 ? 0 : uy > 0 ? 12 : -8)
          return (
            <g key={n.name}>
              <motion.line
                x1={CX} y1={CY} x2={nx} y2={ny}
                stroke={DARK} strokeWidth={1.4} strokeDasharray="4 5" opacity={0.45}
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={drawTransition(0.9 + i * 0.12, 0.6)}
              />
              <motion.circle
                cx={nx} cy={ny} r={isOcean ? 5 : 6}
                fill={isOcean ? "#9ec7d6" : "white"} stroke={isOcean ? "#5a93a8" : SAGE} strokeWidth={2}
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.1 + i * 0.12, type: "spring", stiffness: 300, damping: 16 }}
              />
              <motion.text
                x={lx} y={ly} textAnchor={anchor} fontSize={12.5} fontWeight={600}
                fill={isOcean ? "#5a93a8" : DARK}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 1.25 + i * 0.12, duration: 0.4 }}
              >
                {n.name}
              </motion.text>
            </g>
          )
        })}

        {/* centre pin (the site) */}
        <motion.circle
          cx={CX} cy={CY} r={20} fill="none" stroke={SAND} strokeWidth={2}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [0.9, 1.5, 0.9], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 1 }}
        />
        <motion.circle
          cx={CX} cy={CY} r={9} fill={SAND} stroke="white" strokeWidth={2.5}
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 14 }}
        />
        <motion.text
          x={CX} y={CY - 28} textAnchor="middle" fontSize={15} fontWeight={700} fill={DARK}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          {site.name}
        </motion.text>
      </svg>

      {/* numeric scale bar — line length tracks the tree count */}
      <div style={{ maxWidth: 460, margin: "10px auto 0", padding: "0 8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8a8170", fontWeight: 700 }}>Coverage</span>
          <span className="font-display" style={{ fontSize: 22, fontWeight: 600, color: SAGE }}>
            <Counter to={site.trees} /> <span style={{ fontSize: 12, color: "#8a8170", fontWeight: 500 }}>trees</span>
          </span>
        </div>
        <div style={{ height: coverW + 2, background: "#E7E1D4", borderRadius: 999, overflow: "hidden" }}>
          <motion.div
            style={{ height: "100%", background: `linear-gradient(90deg, ${SAGE}, ${SAND})`, borderRadius: 999 }}
            initial={{ width: 0 }} animate={{ width: `${ratio * 100}%` }}
            transition={{ delay: 0.6, duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      </div>
    </div>
  )
}
