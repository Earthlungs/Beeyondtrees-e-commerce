"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView, useAnimate, stagger } from "motion/react"

const SAGE = "#6B7D5C"

// Orchestrated delivery: a lorry drives onto dark tarmac, opens its rear door,
// loads goods, closes up, switches on its lights and speeds off — then the
// tarmac becomes a button that ticks "Your products are on the way".
export function DeliveryAnimation() {
  const [scope, animate] = useAnimate()
  const stageRef = useRef<HTMLDivElement>(null)
  const inView = useInView(stageRef, { once: true, amount: 0.35 })
  const [delivered, setDelivered] = useState(false)

  useEffect(() => {
    if (!inView) return
    let cancelled = false
    const run = async () => {
      await animate("#lorry", { left: ["-32%", "30%"] }, { duration: 1.15, ease: "easeOut" })
      if (cancelled) return
      await animate("#door", { y: "-104%", opacity: 0.25 }, { duration: 0.45, ease: "easeInOut" })
      if (cancelled) return
      await animate(".pkg", { x: 52, opacity: [1, 1, 0] }, { duration: 0.7, delay: stagger(0.2), ease: "easeIn" })
      if (cancelled) return
      await animate("#door", { y: "0%", opacity: 1 }, { duration: 0.4, ease: "easeInOut" })
      if (cancelled) return
      await animate([
        [".headlight", { opacity: 1 }, { duration: 0.25 }],
        ["#beam", { opacity: 0.55, scaleX: 1 }, { duration: 0.3, at: "<" }],
      ])
      if (cancelled) return
      await animate("#lorry", { left: "132%" }, { duration: 1.05, ease: "easeIn" })
      if (cancelled) return
      setDelivered(true)
    }
    run()
    return () => { cancelled = true }
  }, [inView, animate])

  return (
    <div ref={stageRef} style={{ position: "relative", height: 184, marginTop: 18 }}>
      {!delivered ? (
        <div ref={scope} style={{ position: "absolute", inset: 0 }}>
          {/* dark tarmac */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 58, background: "linear-gradient(180deg,#3c3c3c,#262626)", borderRadius: 16, boxShadow: "inset 0 2px 0 rgba(255,255,255,0.06)" }}>
            <div style={{ position: "absolute", left: 26, right: 26, top: "50%", height: 3, transform: "translateY(-50%)", background: "repeating-linear-gradient(90deg,#E6D3A3 0 26px, transparent 26px 52px)", opacity: 0.8 }} />
          </div>

          {/* lorry (faces right) */}
          <div id="lorry" style={{ position: "absolute", left: "-32%", bottom: 28, display: "flex", alignItems: "flex-end", filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.25))" }}>
            {/* cargo */}
            <div style={{ position: "relative", width: 118, height: 66, background: SAGE, borderRadius: "6px 9px 9px 6px", boxShadow: "inset 0 -10px 0 rgba(0,0,0,0.12)" }}>
              <div style={{ position: "absolute", left: 6, top: 7, width: 22, height: 52, background: "#2a3324", borderRadius: 3 }} />
              <div id="door" style={{ position: "absolute", left: 4, top: 5, width: 24, height: 56, background: "#4A5A3F", borderRadius: 3, borderRight: "2px solid #3d4a33" }} />
              {[0, 1, 2].map((i) => (
                <div key={i} className="pkg" style={{ position: "absolute", left: -28 - i * 3, bottom: 6, width: 16, height: 16, background: "#C8945A", borderRadius: 3, boxShadow: "inset 0 0 0 1.5px rgba(0,0,0,0.18)" }} />
              ))}
            </div>
            {/* cab */}
            <div style={{ position: "relative", width: 46, height: 50, background: "#3F4D35", borderRadius: "6px 11px 6px 6px", marginLeft: -2 }}>
              <div style={{ position: "absolute", right: 6, top: 8, width: 26, height: 17, background: "#BBD4DF", opacity: 0.75, borderRadius: 3 }} />
              <div className="headlight" style={{ position: "absolute", right: -1, bottom: 9, width: 7, height: 7, borderRadius: "50%", background: "#FFE08A", opacity: 0, boxShadow: "0 0 9px 2px rgba(255,224,138,0.9)" }} />
              <div id="beam" style={{ position: "absolute", right: -42, bottom: 5, width: 42, height: 20, background: "linear-gradient(90deg, rgba(255,224,138,0.55), transparent)", clipPath: "polygon(0 38%,0 62%,100% 100%,100% 0)", opacity: 0, transformOrigin: "left center" }} />
            </div>
            {/* wheels */}
            <div style={{ position: "absolute", bottom: -8, left: 20, width: 18, height: 18, borderRadius: "50%", background: "#1f1f1f", border: "3px solid #5a5a5a" }} />
            <div style={{ position: "absolute", bottom: -8, left: 122, width: 18, height: 18, borderRadius: "50%", background: "#1f1f1f", border: "3px solid #5a5a5a" }} />
          </div>
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <motion.button
          onClick={() => { window.location.href = "/products" }}
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 210, damping: 18 }}
          style={{ border: "none", cursor: "pointer", padding: 0, background: "transparent" }}
        >
          <motion.span
            animate={{ scale: [1, 1.045, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ display: "inline-flex", alignItems: "center", gap: 13, background: "linear-gradient(135deg,#6B7D5C,#2D3626)", color: "white", borderRadius: 999, padding: "15px 26px", fontSize: 16, fontWeight: 600, boxShadow: "0 20px 44px -16px rgba(45,54,38,0.7)", whiteSpace: "nowrap" }}
          >
            <span style={{ width: 26, height: 26, borderRadius: "50%", background: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <motion.path d="M4 12.5 L10 18 L20 6.5" fill="none" stroke={SAGE} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.18, ease: "easeOut" }} />
              </svg>
            </span>
            Your products are on the way
          </motion.span>
        </motion.button>
        </div>
      )}
    </div>
  )
}
