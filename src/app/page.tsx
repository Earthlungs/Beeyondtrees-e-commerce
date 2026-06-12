"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import { useProductStore } from "@/store/product-store"
import { useCartStore } from "@/store/cart-store"
import { Header } from "@/components/layout/Header"
import { ScrollProgress } from "@/components/motion/ScrollProgress"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"
import { DeliveryAnimation } from "@/components/motion/DeliveryAnimation"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import {
  ArrowRight, TreePine, Users, Globe, Sprout, Leaf, ShoppingBag,
  ChevronDown, MapPin, Phone, Mail, ArrowUpRight,
  Hexagon, Trees, Milk, Palette,
} from "lucide-react"

const SAGE = "#6B7D5C"
const DARK = "#4A3F2F"
const CREAM = "#F5F1E8"
const SAND = "#E6D3A3"

const slugify = (n: string) => n.toLowerCase().replace(/\s+/g, "-")

export default function Home() {
  const products = useProductStore((s) => s.products)
  const loadProducts = useProductStore((s) => s.loadProducts)
  const addItem = useCartStore((s) => s.addItem)
  const [doneFirstLoad, setDoneFirstLoad] = useState(false)

  useEffect(() => {
    loadProducts().finally(() => setDoneFirstLoad(true))
  }, [loadProducts])

  const showSkeleton = products.length === 0 && !doneFirstLoad
  const featured = products.slice(0, 8)

  // Parallax hero
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "28%"])
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.2])
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "60%"])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const headline = ["BEEyond", "Trees"]

  const handleAdd = (p: typeof products[number]) => {
    addItem({
      id: `${p.id}-retail`,
      name: p.name,
      price: p.retailPrice,
      image: `/api/products/${p.id}/image`,
      pricingTier: "retail",
      maxQuantity: p.stock,
      minQuantity: 1,
    })
  }

  return (
    <div style={{ backgroundColor: CREAM, overflowX: "hidden" }}>
      <ScrollProgress />
      <Header />

      {/* ───────── HERO ───────── */}
      <section ref={heroRef} style={{ position: "relative", height: "92vh", minHeight: 560, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <motion.div
          style={{
            position: "absolute", inset: 0, y: bgY, scale: bgScale,
            backgroundImage: 'url("https://images.unsplash.com/photo-1511497584788-876760111969?w=1600&q=80")',
            backgroundSize: "cover", backgroundPosition: "center",
          }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(28,34,24,0.55) 0%, rgba(28,34,24,0.35) 40%, rgba(28,34,24,0.7) 100%)" }} />

        <motion.div style={{ position: "relative", textAlign: "center", color: "white", padding: "0 24px", maxWidth: 920, y: contentY, opacity: contentOpacity }}>
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
            style={{ textTransform: "uppercase", letterSpacing: "0.32em", fontSize: 12.5, fontWeight: 600, color: SAND, marginBottom: 22 }}
          >
            In partnership with EarthLungs Reforestation Foundation
          </motion.p>

          <h1 className="font-display" style={{ fontSize: "clamp(48px, 9vw, 104px)", fontWeight: 600, lineHeight: 1.0, margin: 0 }}>
            {headline.map((word, i) => (
              <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}>
                <motion.span
                  style={{ display: "inline-block", marginRight: "0.24em", color: i === 0 ? "white" : SAND }}
                  initial={{ y: "110%" }} animate={{ y: 0 }}
                  transition={{ duration: 0.9, delay: 0.25 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7 }}
            style={{ fontSize: "clamp(16px, 2.1vw, 21px)", lineHeight: 1.6, maxWidth: 620, margin: "28px auto 0", opacity: 0.95, fontWeight: 500 }}
          >
            Sustaining Forest Adjacent Communities beyond tree planting and growing.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.85 }}
            style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginTop: 38 }}
          >
            <Link href="/products" style={{ textDecoration: "none" }}>
              <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                style={{ display: "inline-flex", alignItems: "center", gap: 9, backgroundColor: SAGE, color: "white", padding: "15px 30px", borderRadius: 999, fontSize: 15.5, fontWeight: 600, boxShadow: "0 12px 30px -8px rgba(0,0,0,0.5)" }}>
                Shop the Collection <ArrowRight size={18} />
              </motion.span>
            </Link>
            <Link href="/about" style={{ textDecoration: "none" }}>
              <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", color: "white", padding: "15px 30px", borderRadius: 999, fontSize: 15.5, fontWeight: 600, border: "1px solid rgba(255,255,255,0.35)" }}>
                Our Story
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div style={{ position: "absolute", bottom: 26, left: 0, right: 0, display: "flex", justifyContent: "center", color: "white" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
          <div className="byt-bob" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.85 }}>Scroll</span>
            <ChevronDown size={20} />
          </div>
        </motion.div>
      </section>

      {/* ───────── STATS STRIP ───────── */}
      <RevealGroup style={{ maxWidth: 1180, margin: "0 auto", padding: "44px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 24 }}>
        {[
          { n: "40+", l: "Communities" },
          { n: "10,000+", l: "Livelihoods supported" },
          { n: "5", l: "Nature-based enterprises" },
          { n: "100%", l: "Natural goods" },
        ].map((s) => (
          <RevealItem key={s.l} style={{ textAlign: "center" }}>
            <div className="font-display" style={{ fontSize: "clamp(30px,4vw,44px)", fontWeight: 600, color: SAGE, lineHeight: 1 }}>{s.n}</div>
            <div style={{ fontSize: 13, color: "#8a8170", marginTop: 8, letterSpacing: "0.04em" }}>{s.l}</div>
          </RevealItem>
        ))}
      </RevealGroup>

      {/* ───────── COLLECTION ───────── */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 20px 72px" }}>
        <Reveal style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 36 }}>
          <div>
            <p style={{ textTransform: "uppercase", letterSpacing: "0.28em", fontSize: 12, fontWeight: 600, color: SAGE, marginBottom: 10 }}>Featured</p>
            <h2 className="font-display" style={{ fontSize: "clamp(30px,5vw,52px)", fontWeight: 600, color: DARK, lineHeight: 1.05, margin: 0 }}>Our Collection</h2>
          </div>
          <Link href="/products" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, color: SAGE, fontWeight: 600, fontSize: 15 }}>
            View all <ArrowUpRight size={18} />
          </Link>
        </Reveal>

        {showSkeleton ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 22 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 18, overflow: "hidden", backgroundColor: "white", border: "1px solid #E7E1D4" }}>
                <Skeleton className="h-[230px] w-full rounded-none" />
                <div style={{ padding: 16 }}>
                  <Skeleton className="h-3 w-1/3 mb-3" />
                  <Skeleton className="h-4 w-4/5 mb-3" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : featured.length > 0 ? (
          <RevealGroup style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 22 }} stagger={0.07}>
            {featured.map((p) => (
              <RevealItem key={p.id}>
                <div className="byt-card" style={{ borderRadius: 18, overflow: "hidden", backgroundColor: "white", border: "1px solid #E7E1D4", height: "100%", display: "flex", flexDirection: "column" }}>
                  <Link href={`/products/${slugify(p.name)}`} style={{ textDecoration: "none", display: "block" }}>
                    <div style={{ position: "relative", height: 230, backgroundColor: "#F3EFE6", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <TreePine size={42} style={{ color: SAGE, opacity: 0.25, position: "absolute" }} />
                      <img className="byt-zoom" src={`/api/products/${p.id}/image`} alt={p.name} loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = "none" }}
                        style={{ width: "100%", height: "100%", objectFit: "cover", position: "relative" }} />
                      {p.stock <= 5 && p.stock > 0 && (
                        <span style={{ position: "absolute", top: 12, left: 12, background: "rgba(230,168,23,0.95)", color: "white", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999 }}>Only {p.stock} left</span>
                      )}
                      {p.stock === 0 && (
                        <span style={{ position: "absolute", top: 12, left: 12, background: "rgba(140,106,74,0.95)", color: "white", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999 }}>Sold out</span>
                      )}
                    </div>
                  </Link>
                  <div style={{ padding: "16px 16px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
                    <p style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 10.5, color: "#A89F91", fontWeight: 600, marginBottom: 6 }}>{p.category}</p>
                    <Link href={`/products/${slugify(p.name)}`} style={{ textDecoration: "none" }}>
                      <h3 style={{ fontWeight: 600, color: DARK, fontSize: 15.5, lineHeight: 1.3, margin: "0 0 10px", minHeight: 40 }}>{p.name}</h3>
                    </Link>
                    <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <span className="font-display" style={{ fontSize: 19, fontWeight: 600, color: DARK }}>KSh {p.retailPrice?.toLocaleString()}</span>
                      <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }} disabled={p.stock === 0}
                        onClick={() => handleAdd(p)} aria-label="Add to cart"
                        style={{ width: 40, height: 40, borderRadius: 12, border: "none", backgroundColor: p.stock === 0 ? "#E7E1D4" : SAGE, color: "white", cursor: p.stock === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <ShoppingBag size={17} />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        ) : (
          <div style={{ textAlign: "center", padding: "64px 24px", color: "#A89F91" }}>
            <TreePine size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <p style={{ fontSize: 16, marginBottom: 6 }}>Our collection is taking root.</p>
            <p style={{ fontSize: 14 }}>Check back soon for new arrivals.</p>
          </div>
        )}
      </section>

      {/* ───────── VALUES ───────── */}
      <section style={{ backgroundColor: "#EFE9DC", padding: "84px 20px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 50 }}>
            <p style={{ textTransform: "uppercase", letterSpacing: "0.28em", fontSize: 12, fontWeight: 600, color: SAGE, marginBottom: 12 }}>Why BEEyond</p>
            <h2 className="font-display" style={{ fontSize: "clamp(28px,4.5vw,46px)", fontWeight: 600, color: DARK, margin: 0 }}>Rooted in regeneration</h2>
          </Reveal>
          <RevealGroup style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 22 }} stagger={0.1}>
            {[
              { icon: Sprout, t: "Reforestation", d: "Every order funds indigenous trees, restoring Kenya's forests one canopy at a time." },
              { icon: Users, t: "Community First", d: "We sustain forest-adjacent livelihoods beyond planting, fair work, lasting income." },
              { icon: Globe, t: "Sustainability", d: "Naturally sourced, low-impact goods designed to be kind to the land they come from." },
            ].map((v) => (
              <RevealItem key={v.t}>
                <div style={{ backgroundColor: "white", borderRadius: 20, padding: "34px 28px", height: "100%", border: "1px solid #E2DAC9" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: CREAM, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <v.icon size={26} style={{ color: SAGE }} />
                  </div>
                  <h3 className="font-display" style={{ fontSize: 22, fontWeight: 600, color: DARK, marginBottom: 10 }}>{v.t}</h3>
                  <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#6b6353", margin: 0 }}>{v.d}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ───────── STORY ───────── */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "90px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 56, alignItems: "center" }}>
          <Reveal>
            <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", aspectRatio: "4/5", boxShadow: "0 40px 70px -40px rgba(74,63,47,0.5)" }}>
              <img src="https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=900&q=80" alt="Handcrafted natural furniture" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <p style={{ textTransform: "uppercase", letterSpacing: "0.28em", fontSize: 12, fontWeight: 600, color: SAGE, marginBottom: 16 }}>Our Story</p>
            <h2 className="font-display" style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 600, color: DARK, lineHeight: 1.1, marginBottom: 22 }}>
              A flagship initiative for people <span style={{ fontStyle: "italic", color: SAGE }}>and</span> planet
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: "#6b6353", marginBottom: 18 }}>
              BEEyond Trees is developed by the EarthLungs Reforestation Foundation in Kenya, a sustainability and livelihood initiative that goes beyond planting and growing trees.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: "#6b6353", marginBottom: 30 }}>
              By turning natural, responsibly-sourced products into income for forest-adjacent communities, we make conservation something people can live on.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "16px 0", borderTop: "1px solid #E2DAC9", marginBottom: 26 }}>
              <img src="/earthlungs.png" alt="EarthLungs Reforestation Foundation" width={40} height={40} style={{ width: 40, height: 40, objectFit: "contain", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "#A89F91", fontWeight: 700 }}>In partnership with</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: DARK }}>EarthLungs Reforestation Foundation</div>
              </div>
            </div>
            <Link href="/where-we-work" style={{ textDecoration: "none" }}>
              <motion.span whileHover={{ x: 5 }} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: SAGE, fontWeight: 600, fontSize: 16 }}>
                See where we work <ArrowRight size={18} />
              </motion.span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ───────── CORE COMPONENTS ───────── */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "92px 20px 40px" }}>
        <Reveal style={{ textAlign: "center", marginBottom: 46, maxWidth: 760, marginInline: "auto" }}>
          <p style={{ textTransform: "uppercase", letterSpacing: "0.28em", fontSize: 12, fontWeight: 600, color: SAGE, marginBottom: 12 }}>What we do</p>
          <h2 className="font-display" style={{ fontSize: "clamp(28px,4.5vw,46px)", fontWeight: 600, color: DARK, marginBottom: 16 }}>Core components of BEEyond Trees</h2>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: "#6b6353" }}>
            Nature-based enterprises that deliver long-term economic benefits to forest-adjacent communities, while ensuring ecological stewardship of restored landscapes.
          </p>
        </Reveal>
        <RevealGroup style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }} stagger={0.08}>
          {[
            { icon: Hexagon, t: "Apiculture (Beekeeping)", d: "Modern hives on farmlands adjacent to mangrove and terrestrial restoration sites. Women and youth trained in sustainable honey and wax production." },
            { icon: Sprout, t: "Fungi-Culture (Mushrooms)", d: "Recycled coconut coir and agro-waste from restoration sites turned into mushrooms and income-generating value chains." },
            { icon: Trees, t: "Bamboo Value Chain", d: "Fast-growing bamboo for furniture, construction and carbon, with local workshops for baskets, lampshades, trays and mats." },
            { icon: Milk, t: "Dairy Goat Farming", d: "High-yielding, disease-resistant breeds piloted in Mombasa. Goat manure enriches agroforestry soils and household nutrition." },
            { icon: Palette, t: "Handicraft & Weaving", d: "Natural fibres, coconut husk, banana and bamboo, woven into ropes, mats and artisanal goods by women's groups." },
            { icon: Users, t: "People-first Impact", d: "Economic empowerment, gender inclusion and circular-economy models, built to scale across EarthLungs' territories." },
          ].map((c) => (
            <RevealItem key={c.t}>
              <div style={{ background: "white", border: "1px solid #E7E1D4", borderRadius: 20, padding: "30px 26px", height: "100%" }}>
                <div style={{ width: 52, height: 52, borderRadius: 15, background: "#EFE9DC", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  <c.icon size={24} style={{ color: SAGE }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: DARK, marginBottom: 9 }}>{c.t}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#6b6353", margin: 0 }}>{c.d}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ───────── DELIVERY (animated lorry) ───────── */}
      <section style={{ background: "#EFE9DC", overflow: "hidden", padding: "76px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 30 }}>
            <p style={{ textTransform: "uppercase", letterSpacing: "0.28em", fontSize: 12, fontWeight: 600, color: SAGE, marginBottom: 12 }}>Logistics</p>
            <h2 className="font-display" style={{ fontSize: "clamp(26px,4vw,42px)", fontWeight: 600, color: DARK, margin: 0 }}>Delivered across Kenya</h2>
            <p style={{ color: "#8a8170", fontSize: 16, marginTop: 12 }}>From our community hubs to your door, county to county.</p>
          </Reveal>

          <DeliveryAnimation />
        </div>
      </section>

      {/* ───────── CTA BAND ───────── */}
      <section style={{ position: "relative", overflow: "hidden", background: `linear-gradient(135deg, ${SAGE} 0%, #4A5A3F 60%, #2D3626 100%)`, color: "white", padding: "84px 20px", textAlign: "center" }}>
        <Leaf size={120} style={{ position: "absolute", top: -20, right: -10, opacity: 0.06 }} />
        <Leaf size={120} style={{ position: "absolute", bottom: -30, left: -20, opacity: 0.06, transform: "rotate(180deg)" }} />
        <Reveal style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
          <h2 className="font-display" style={{ fontSize: "clamp(28px,4.5vw,46px)", fontWeight: 600, marginBottom: 16 }}>More than an initiative, a movement</h2>
          <p style={{ fontSize: 17, opacity: 0.92, lineHeight: 1.7, marginBottom: 30 }}>
            BEEyond Trees empowers communities to become custodians of the forests they helped restore, a future built on sustainable livelihoods, circular economies and people-first conservation.
          </p>
          <Link href="/products" style={{ textDecoration: "none" }}>
            <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              style={{ display: "inline-flex", alignItems: "center", gap: 10, backgroundColor: "white", color: DARK, padding: "16px 34px", borderRadius: 999, fontSize: 16, fontWeight: 700 }}>
              Start shopping <ArrowRight size={19} />
            </motion.span>
          </Link>
        </Reveal>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer style={{ backgroundColor: "#3D3226", color: "#E8E1D4", padding: "60px 20px 28px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 36, marginBottom: 44 }}>
            <div>
              <div className="font-display" style={{ fontSize: 22, fontWeight: 600, color: "white", marginBottom: 12 }}>BEEyond Trees</div>
              <p style={{ fontSize: 14, color: "#B8A99A", lineHeight: 1.7, maxWidth: 260 }}>Sustainable natural products from Kenya, sustaining forest-adjacent communities beyond tree planting.</p>
            </div>
            <div>
              <h4 style={{ fontWeight: 600, marginBottom: 14, color: "white", fontSize: 14, letterSpacing: "0.05em" }}>Explore</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 14 }}>
                {[["Home", "/"], ["Shop", "/products"], ["New Arrivals", "/new-arrivals"], ["About", "/about"]].map(([l, h]) => (
                  <Link key={h} href={h} style={{ color: "#B8A99A", textDecoration: "none" }}>{l}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ fontWeight: 600, marginBottom: 14, color: "white", fontSize: 14, letterSpacing: "0.05em" }}>Company</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 14 }}>
                {[["Where We Work", "/where-we-work"], ["Careers", "/careers"], ["Contact", "/contact"], ["Staff Portal", "/portal"]].map(([l, h]) => (
                  <Link key={h} href={h} style={{ color: "#B8A99A", textDecoration: "none" }}>{l}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ fontWeight: 600, marginBottom: 14, color: "white", fontSize: 14, letterSpacing: "0.05em" }}>Reach us</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 11, fontSize: 14, color: "#B8A99A" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><MapPin size={15} /> Nairobi, Kenya</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Phone size={15} /> +254 718 681 684</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Mail size={15} /> beeyondtrees@earthlungs.org</span>
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 22, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, fontSize: 13, color: "#9a8d7d" }}>
            <span>© {new Date().getFullYear()} BEEyond Trees. All rights reserved.</span>
            <span>Powered by EarthLungs Reforestation Foundation</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
