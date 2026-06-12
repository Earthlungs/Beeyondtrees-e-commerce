"use client"

import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { ScrollProgress } from "@/components/motion/ScrollProgress"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { Counter } from "@/components/motion/Counter"
import { SketchMap, type Neighbor, type MapSite } from "@/components/motion/SketchMap"
import { motion, AnimatePresence } from "motion/react"
import { MapPin, TreePine, X } from "lucide-react"
import { useState } from "react"

const SAGE = "#6B7D5C"
const DARK = "#4A3F2F"
const CREAM = "#F5F1E8"

// Real neighbouring areas per landscape, placed by rough compass direction so
// the sketch map reads geographically (ocean to the east of the coast, etc.).
const neighborsByLocation: Record<string, Neighbor[]> = {
  "Kilifi County": [
    { name: "Tana River", dir: "N" }, { name: "Malindi", dir: "NE" },
    { name: "Indian Ocean", dir: "E" }, { name: "Kwale", dir: "S" },
    { name: "Mombasa", dir: "SW" }, { name: "Taita Taveta", dir: "W" },
  ],
  "Tana River County": [
    { name: "Garissa", dir: "N" }, { name: "Lamu", dir: "E" },
    { name: "Indian Ocean", dir: "SE" }, { name: "Kilifi", dir: "S" },
    { name: "Kitui", dir: "W" },
  ],
  "Mkinga District": [
    { name: "Lunga Lunga (KE)", dir: "N" }, { name: "Indian Ocean", dir: "E" },
    { name: "Tanga City", dir: "S" }, { name: "Muheza", dir: "SW" },
  ],
  "Tanga District": [
    { name: "Muheza", dir: "NW" }, { name: "Indian Ocean", dir: "E" },
    { name: "Pangani", dir: "S" }, { name: "Korogwe", dir: "W" },
  ],
  "Mozambique": [
    { name: "Tanzania", dir: "N" }, { name: "Indian Ocean", dir: "E" },
    { name: "Nampula", dir: "S" }, { name: "Niassa", dir: "W" },
  ],
}

const neighborsFor = (location: string): Neighbor[] =>
  neighborsByLocation[location] ?? [
    { name: "Indian Ocean", dir: "E" }, { name: "Highlands", dir: "W" },
  ]

const countries = [
  {
    name: "Kenya", total: 57122122, blurb: "Coastal mangroves and inland indigenous forests, restored hand in hand with forest-adjacent communities.",
    sites: [
      { name: "Kuchi", location: "Kilifi County", trees: 4991918 },
      { name: "Mandharini", location: "Kilifi County", trees: 2895790 },
      { name: "Tana Salt", location: "Tana River County", trees: 3437838 },
      { name: "Chara", location: "Tana River County", trees: 3352593 },
    ],
  },
  {
    name: "Tanzania", total: 45620531, blurb: "Mangrove and montane restoration across the Tanga and Mkinga landscapes.",
    sites: [
      { name: "Boma Kikwajuni", location: "Mkinga District", trees: 1378721 },
      { name: "Boma Kichakamiba", location: "Mkinga District", trees: 525617 },
      { name: "Sigi", location: "Tanga District", trees: 704306 },
      { name: "Chongoleani", location: "Tanga District", trees: 424835 },
    ],
  },
  {
    name: "Mozambique", total: 4496831, blurb: "Emerging restoration hubs extending the model into new territories.",
    sites: [
      { name: "Gadzene-Macavule", location: "Mozambique", trees: 4496831 },
    ],
  },
]

export default function WhereWeWorkPage() {
  const [selected, setSelected] = useState<{ site: MapSite; maxTrees: number } | null>(null)

  return (
    <div style={{ backgroundColor: CREAM, minHeight: "100vh", overflowX: "hidden" }}>
      <ScrollProgress />
      <Header />

      {/* Hero */}
      <section style={{ position: "relative", padding: "100px 20px 90px", overflow: "hidden", color: "white", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: 'linear-gradient(rgba(28,34,24,0.62), rgba(28,34,24,0.72)), url("https://images.unsplash.com/photo-1511497584788-876760111969?w=1600&q=80") center/cover' }} />
        <motion.div style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p style={{ textTransform: "uppercase", letterSpacing: "0.3em", fontSize: 12, fontWeight: 600, color: "#E6D3A3", marginBottom: 16 }}>Our footprint</p>
          <h1 className="font-display" style={{ fontSize: "clamp(38px, 6vw, 68px)", fontWeight: 600, lineHeight: 1.05, marginBottom: 20 }}>Where We Work</h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, opacity: 0.92 }}>
            From the dense forests of Kenya to the diverse landscapes of Tanzania, we work hand in hand with local communities to restore ecosystems, combat deforestation, and create sustainable change.
          </p>
        </motion.div>
      </section>

      {/* Impact banner */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 20px" }}>
        <Reveal style={{ textAlign: "center", marginBottom: 36 }}>
          <p style={{ textTransform: "uppercase", letterSpacing: "0.28em", fontSize: 12, fontWeight: 600, color: SAGE, marginBottom: 10 }}>Collective impact</p>
          <div className="font-display" style={{ fontSize: "clamp(44px, 8vw, 84px)", fontWeight: 600, color: DARK, lineHeight: 1 }}>
            <Counter to={107239484} />
          </div>
          <p style={{ color: "#8a8170", fontSize: 16, marginTop: 8 }}>trees planted and growing</p>
        </Reveal>
        <RevealGroup style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18 }} stagger={0.1}>
          {countries.map((c) => (
            <RevealItem key={c.name} style={{ textAlign: "center", background: "white", border: "1px solid #E7E1D4", borderRadius: 18, padding: "26px 18px" }}>
              <div className="font-display" style={{ fontSize: 30, fontWeight: 600, color: SAGE }}><Counter to={c.total} /></div>
              <div style={{ fontSize: 14, color: "#6b6353", marginTop: 6, fontWeight: 500 }}>{c.name}</div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* Country sections */}
      {countries.map((c, ci) => (
        <section key={c.name} style={{ background: ci % 2 ? "#EFE9DC" : "transparent", padding: "64px 20px" }}>
          <div style={{ maxWidth: 1180, margin: "0 auto" }}>
            <Reveal style={{ marginBottom: 34, maxWidth: 640 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <span className="font-display" style={{ fontSize: "clamp(28px,4vw,42px)", fontWeight: 600, color: DARK }}>{c.name}</span>
                <span style={{ background: SAGE, color: "white", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 999 }}>{c.sites.length} site{c.sites.length > 1 ? "s" : ""}</span>
              </div>
              <p style={{ color: "#8a8170", fontSize: 15.5, lineHeight: 1.7 }}>{c.blurb}</p>
            </Reveal>
            <RevealGroup style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }} stagger={0.06}>
              {c.sites.map((s) => {
                const maxTrees = Math.max(...c.sites.map((x) => x.trees))
                const open = () => setSelected({
                  site: { name: s.name, location: s.location, trees: s.trees, neighbors: neighborsFor(s.location) },
                  maxTrees,
                })
                return (
                <RevealItem key={s.name}>
                  <motion.div
                    onClick={open}
                    whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}
                    role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open() } }}
                    className="byt-card" style={{ background: "white", border: "1px solid #E7E1D4", borderRadius: 18, padding: "24px 22px", height: "100%", cursor: "pointer" }}
                  >
                    <div style={{ width: 46, height: 46, borderRadius: 13, background: "#EFE9DC", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                      <TreePine size={22} style={{ color: SAGE }} />
                    </div>
                    <h3 style={{ fontSize: 19, fontWeight: 700, color: DARK, marginBottom: 6 }}>{s.name}</h3>
                    <p style={{ display: "flex", alignItems: "center", gap: 6, color: "#A89F91", fontSize: 13.5, marginBottom: 16 }}>
                      <MapPin size={14} /> {s.location}
                    </p>
                    <div className="font-display" style={{ fontSize: 26, fontWeight: 600, color: SAGE }}><Counter to={s.trees} /></div>
                    <div style={{ fontSize: 12.5, color: "#8a8170", marginTop: 2 }}>trees planted</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 14, color: SAGE, fontSize: 12.5, fontWeight: 600 }}>
                      <MapPin size={13} /> View coverage map
                    </div>
                  </motion.div>
                </RevealItem>
                )
              })}
            </RevealGroup>
          </div>
        </section>
      ))}

      {/* Coverage map modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            onClick={() => setSelected(null)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(28,34,24,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          >
            <motion.div
              key={selected.site.name}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
              style={{ background: CREAM, borderRadius: 24, padding: "26px 24px 30px", maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 40px 90px -30px rgba(0,0,0,0.6)", position: "relative" }}
            >
              <button onClick={() => setSelected(null)} aria-label="Close"
                style={{ position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: "50%", border: "none", background: "#E7E1D4", color: DARK, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={18} />
              </button>

              <div style={{ marginBottom: 18 }}>
                <p style={{ textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 11, fontWeight: 700, color: SAGE, marginBottom: 6 }}>Restoration site</p>
                <h3 className="font-display" style={{ fontSize: 26, fontWeight: 600, color: DARK, margin: 0 }}>{selected.site.name}</h3>
                <p style={{ display: "flex", alignItems: "center", gap: 6, color: "#8a8170", fontSize: 14, marginTop: 4 }}>
                  <MapPin size={14} /> {selected.site.location} · neighbouring areas mapped
                </p>
              </div>

              <SketchMap site={selected.site} maxTrees={selected.maxTrees} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  )
}
