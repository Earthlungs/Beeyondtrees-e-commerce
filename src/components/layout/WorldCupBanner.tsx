"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X } from "lucide-react"

const TICKER_ITEMS = [
  "🇧🇷 Brazil", "🇩🇪 Germany", "🇫🇷 France", "🇦🇷 Argentina", "🇪🇸 Spain",
  "🇵🇹 Portugal", "🇲🇽 Mexico", "🇯🇵 Japan", "🇳🇬 Nigeria", "🇰🇪 Kenya",
  "🇿🇦 South Africa", "🇲🇦 Morocco", "🇺🇸 USA", "🇨🇦 Canada", "🇬🇧 England",
  "🇮🇹 Italy", "🇳🇱 Netherlands", "🇺🇾 Uruguay", "🇨🇴 Colombia", "🇧🇪 Belgium",
]

const STORAGE_KEY = "wc2026-banner-dismissed"

export function WorldCupBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY)
    if (!dismissed) setVisible(true)
  }, [])

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1")
    setVisible(false)
  }

  // Double up so the marquee loops seamlessly
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 36, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: "linear-gradient(90deg, #1a6b2e 0%, #0d5c3a 40%, #1a6b2e 100%)",
            overflow: "hidden",
            position: "relative",
            zIndex: 60,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", height: 36, width: "100%" }}>
            {/* Left pill */}
            <div style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 14px",
              borderRight: "1px solid rgba(255,255,255,0.18)",
              height: "100%",
              whiteSpace: "nowrap",
              zIndex: 2,
              background: "inherit",
            }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>⚽</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", letterSpacing: 0.8, textTransform: "uppercase" }}>
                FIFA World Cup 2026
              </span>
              <span style={{ fontSize: 16, lineHeight: 1 }}>🏆</span>
            </div>

            {/* Scrolling ticker */}
            <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
              {/* Fade edges */}
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 40, background: "linear-gradient(90deg, #0d5c3a, transparent)", zIndex: 1 }} />
              <div style={{ position: "absolute", right: 40, top: 0, bottom: 0, width: 40, background: "linear-gradient(-90deg, #0d5c3a, transparent)", zIndex: 1 }} />

              <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{ repeat: Infinity, duration: 28, ease: "linear" }}
                style={{ display: "flex", alignItems: "center", gap: 28, whiteSpace: "nowrap", paddingLeft: 24 }}
              >
                {items.map((item, i) => (
                  <span key={i} style={{ fontSize: 12.5, color: "rgba(255,255,255,0.88)", fontWeight: 500, flexShrink: 0 }}>
                    {item}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Bouncing ball */}
            <motion.div
              animate={{ y: [-4, 4, -4] }}
              transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut" }}
              style={{ flexShrink: 0, fontSize: 18, padding: "0 10px", zIndex: 2 }}
            >
              ⚽
            </motion.div>

            {/* Dismiss */}
            <button
              onClick={dismiss}
              aria-label="Dismiss World Cup banner"
              style={{
                flexShrink: 0, marginRight: 8, width: 26, height: 26, borderRadius: 8,
                background: "rgba(255,255,255,0.12)", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.75)",
              }}
            >
              <X size={13} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
