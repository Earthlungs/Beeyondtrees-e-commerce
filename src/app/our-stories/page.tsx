"use client"

import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { ScrollProgress } from "@/components/motion/ScrollProgress"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { motion } from "motion/react"
import { Play, ArrowRight, Clock } from "lucide-react"

const SAGE = "#6B7D5C"
const DARK = "#4A3F2F"
const CREAM = "#F5F1E8"

const stories = [
  { title: "Transforming Mangrove Restoration through trenching", tag: "Restoration", excerpt: "How community-led trenching is reviving degraded mangroves along the Kenyan coast.", img: "https://images.unsplash.com/photo-1511497584788-876760111969?w=900&q=80" },
  { title: "Transforming Mangrove Restoration through trenching", tag: "Coast", excerpt: "Restoring tidal flow brings seedlings, fish and livelihoods back to the shoreline.", img: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=900&q=80" },
  { title: "Transforming Mangrove Restoration through trenching", tag: "Community", excerpt: "Local stewards turn restoration sites into lasting, income-generating ecosystems.", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=80" },
]

const videos = [
  { title: "Women Empowerment", length: "0:16", img: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=900&q=80" },
  { title: "veritree Partnership", length: "0:16", img: "https://images.unsplash.com/photo-1503602642458-232111445657?w=900&q=80" },
]

export default function OurStoriesPage() {
  return (
    <div style={{ backgroundColor: CREAM, minHeight: "100vh", overflowX: "hidden" }}>
      <ScrollProgress />
      <Header />

      {/* Hero */}
      <section style={{ position: "relative", padding: "100px 20px 90px", overflow: "hidden", color: "white", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: 'linear-gradient(rgba(28,34,24,0.6), rgba(28,34,24,0.74)), url("https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1600&q=80") center/cover' }} />
        <motion.div style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p style={{ textTransform: "uppercase", letterSpacing: "0.3em", fontSize: 12, fontWeight: 600, color: "#E6D3A3", marginBottom: 16 }}>Voices from the field</p>
          <h1 className="font-display" style={{ fontSize: "clamp(38px, 6vw, 68px)", fontWeight: 600, lineHeight: 1.05, marginBottom: 20 }}>Our Stories</h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, opacity: 0.92 }}>
            Every tree we plant carries a story of resilience, hope, and transformation. Discover inspiring stories of the people and places impacted by our reforestation efforts.
          </p>
        </motion.div>
      </section>

      {/* Stories grid */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 20px" }}>
        <RevealGroup style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }} stagger={0.08}>
          {stories.map((s, i) => (
            <RevealItem key={i}>
              <article className="byt-card" style={{ background: "white", border: "1px solid #E7E1D4", borderRadius: 20, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ height: 200, overflow: "hidden" }}>
                  <img className="byt-zoom" src={s.img} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ padding: "22px 22px 24px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <span style={{ alignSelf: "flex-start", background: "#EFE9DC", color: SAGE, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 10px", borderRadius: 999, marginBottom: 12 }}>{s.tag}</span>
                  <h3 className="font-display" style={{ fontSize: 21, fontWeight: 600, color: DARK, lineHeight: 1.25, marginBottom: 10 }}>{s.title}</h3>
                  <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#6b6353", marginBottom: 18 }}>{s.excerpt}</p>
                  <span style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 7, color: SAGE, fontWeight: 600, fontSize: 14.5 }}>
                    Read story <ArrowRight size={16} />
                  </span>
                </div>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* Videos */}
      <section style={{ background: "#EFE9DC", padding: "72px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 40 }}>
            <p style={{ textTransform: "uppercase", letterSpacing: "0.28em", fontSize: 12, fontWeight: 600, color: SAGE, marginBottom: 12 }}>Stories in motion</p>
            <h2 className="font-display" style={{ fontSize: "clamp(28px,4.5vw,46px)", fontWeight: 600, color: DARK, margin: 0 }}>Watch the change</h2>
          </Reveal>
          <RevealGroup style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }} stagger={0.1}>
            {videos.map((v) => (
              <RevealItem key={v.title}>
                <div className="byt-card" style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "16/10", cursor: "pointer" }}>
                  <img className="byt-zoom" src={v.img} alt={v.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.55))" }} />
                  <motion.div whileHover={{ scale: 1.1 }} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Play size={26} style={{ color: SAGE, marginLeft: 3 }} fill={SAGE} />
                  </motion.div>
                  <div style={{ position: "absolute", left: 20, bottom: 18, color: "white" }}>
                    <h3 className="font-display" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{v.title}</h3>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, opacity: 0.9 }}><Clock size={13} /> {v.length}</span>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <Footer />
    </div>
  )
}
