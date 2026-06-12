"use client"

import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { ScrollProgress } from "@/components/motion/ScrollProgress"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { ParallaxImage } from "@/components/motion/ParallaxImage"
import { motion } from "motion/react"
import Link from "next/link"
import {
  Users, Globe, Leaf, Target, Heart, TreePine, ArrowRight,
} from "lucide-react"

const SAGE = "#6B7D5C"
const DARK = "#4A3F2F"
const CREAM = "#F5F1E8"
const SAND = "#E6D3A3"

const pillars = [
  { icon: Target, title: "Our Mission", desc: "To restore and protect ecosystems, fostering biodiversity and sustainable livelihoods through community-driven restoration and conservation efforts." },
  { icon: Heart, title: "Our Vision", desc: "A greener, healthier planet where forest-adjacent communities thrive through sustainable nature-based enterprises." },
  { icon: Globe, title: "Our Impact", desc: "39 active sites across Kenya and Tanzania. Over 1.5 billion trees targeted by 2032 through community-led reforestation." },
]

const values = [
  { icon: Globe, title: "Environmental Stewardship", desc: "We protect and restore our natural environment for future generations." },
  { icon: Users, title: "Community First", desc: "Communities are at the heart of everything we do and build." },
  { icon: Leaf, title: "Innovation", desc: "We develop creative solutions to complex environmental challenges." },
  { icon: TreePine, title: "Impact Driven", desc: "We measure our success by the positive impact we create." },
]

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: CREAM, minHeight: "100vh", overflowX: "hidden" }}>
      <ScrollProgress />
      <Header />

      {/* ───────── HERO ───────── */}
      <section style={{ position: "relative", padding: "108px 20px 96px", overflow: "hidden", color: "white", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: 'linear-gradient(rgba(28,34,24,0.62), rgba(28,34,24,0.76)), url("/icons/mushroom.jpg") center/cover' }} />
        <motion.div style={{ position: "relative", maxWidth: 780, margin: "0 auto" }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p style={{ textTransform: "uppercase", letterSpacing: "0.3em", fontSize: 12, fontWeight: 600, color: SAND, marginBottom: 16 }}>Our Story</p>
          <h1 className="font-display" style={{ fontSize: "clamp(38px, 6vw, 70px)", fontWeight: 600, lineHeight: 1.05, marginBottom: 20 }}>About BEEyond Trees</h1>
          <p style={{ fontSize: 18, lineHeight: 1.7, opacity: 0.92, maxWidth: 640, margin: "0 auto" }}>
            Sustaining forest-adjacent communities beyond tree planting and growing.
          </p>
        </motion.div>
      </section>

      {/* ───────── MISSION / VISION / IMPACT ───────── */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 20px 24px" }}>
        <RevealGroup style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 22 }} stagger={0.1}>
          {pillars.map((item) => (
            <RevealItem key={item.title}>
              <div style={{ background: "white", border: "1px solid #E7E1D4", borderRadius: 20, padding: "34px 28px", height: "100%", textAlign: "center" }}>
                <div style={{ width: 58, height: 58, borderRadius: 16, backgroundColor: CREAM, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                  <item.icon size={26} style={{ color: SAGE }} />
                </div>
                <h3 className="font-display" style={{ fontSize: 22, fontWeight: 600, color: DARK, marginBottom: 10 }}>{item.title}</h3>
                <p style={{ color: "#6b6353", fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ───────── STORY (image + copy) ───────── */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 56, alignItems: "center" }}>
          <Reveal>
            <ParallaxImage src="/icons/people.jpg" alt="The communities behind BEEyond Trees" aspectRatio="4/5" />
          </Reveal>
          <Reveal delay={0.12}>
            <p style={{ textTransform: "uppercase", letterSpacing: "0.28em", fontSize: 12, fontWeight: 600, color: SAGE, marginBottom: 16 }}>How it began</p>
            <h2 className="font-display" style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 600, color: DARK, lineHeight: 1.1, marginBottom: 22 }}>
              Conservation that communities can <span style={{ fontStyle: "italic", color: SAGE }}>live on</span>
            </h2>
            <p style={{ color: "#6b6353", lineHeight: 1.8, fontSize: 16, marginBottom: 16 }}>
              BEEyond Trees was born from a simple yet powerful realization: reforestation efforts cannot succeed without the active participation and economic empowerment of forest-adjacent communities. As a flagship initiative of EarthLungs Reforestation Foundation, we bridge the gap between environmental conservation and sustainable livelihoods.
            </p>
            <p style={{ color: "#6b6353", lineHeight: 1.8, fontSize: 16, marginBottom: 16 }}>
              Our model integrates nature-based enterprises, from sustainable honey production to mushroom farming and artisan crafts, directly into reforestation projects. This creates a virtuous cycle where communities have both the means and motivation to protect and restore their surrounding forests.
            </p>
            <p style={{ color: "#6b6353", lineHeight: 1.8, fontSize: 16, marginBottom: 28 }}>
              Every product sold through this platform directly supports tree planting, community development, and ecosystem restoration across Kenya, Tanzania, and Mozambique.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "16px 0", borderTop: "1px solid #E2DAC9" }}>
              <img src="/earthlungs.png" alt="EarthLungs Reforestation Foundation" width={40} height={40} style={{ width: 40, height: 40, objectFit: "contain", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "#A89F91", fontWeight: 700 }}>In partnership with</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: DARK }}>EarthLungs Reforestation Foundation</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────── CORE VALUES ───────── */}
      <section style={{ backgroundColor: "#EFE9DC", padding: "84px 20px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 50 }}>
            <p style={{ textTransform: "uppercase", letterSpacing: "0.28em", fontSize: 12, fontWeight: 600, color: SAGE, marginBottom: 12 }}>What guides us</p>
            <h2 className="font-display" style={{ fontSize: "clamp(28px,4.5vw,46px)", fontWeight: 600, color: DARK, margin: 0 }}>Core values</h2>
          </Reveal>
          <RevealGroup style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }} stagger={0.08}>
            {values.map((v) => (
              <RevealItem key={v.title}>
                <div style={{ padding: "30px 26px", backgroundColor: "white", borderRadius: 18, border: "1px solid #E2DAC9", height: "100%" }}>
                  <div style={{ width: 50, height: 50, borderRadius: 14, background: CREAM, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <v.icon size={23} style={{ color: SAGE }} />
                  </div>
                  <h4 className="font-display" style={{ fontWeight: 600, color: DARK, marginBottom: 8, fontSize: 18 }}>{v.title}</h4>
                  <p style={{ fontSize: 14, color: "#6b6353", lineHeight: 1.65, margin: 0 }}>{v.desc}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section style={{ position: "relative", overflow: "hidden", background: `linear-gradient(135deg, ${SAGE} 0%, #4A5A3F 60%, #2D3626 100%)`, color: "white", padding: "84px 20px", textAlign: "center" }}>
        <Leaf size={120} style={{ position: "absolute", top: -20, right: -10, opacity: 0.06 }} />
        <Leaf size={120} style={{ position: "absolute", bottom: -30, left: -20, opacity: 0.06, transform: "rotate(180deg)" }} />
        <Reveal style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
          <h2 className="font-display" style={{ fontSize: "clamp(28px,4.5vw,46px)", fontWeight: 600, marginBottom: 16 }}>Shop with purpose</h2>
          <p style={{ fontSize: 17, opacity: 0.92, lineHeight: 1.7, marginBottom: 30 }}>
            Every purchase plants trees and sustains the communities who steward them. Explore goods made by forest-adjacent enterprises across Kenya.
          </p>
          <Link href="/products" style={{ textDecoration: "none" }}>
            <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              style={{ display: "inline-flex", alignItems: "center", gap: 10, backgroundColor: "white", color: DARK, padding: "16px 34px", borderRadius: 999, fontSize: 16, fontWeight: 700 }}>
              Shop the Collection <ArrowRight size={19} />
            </motion.span>
          </Link>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}
