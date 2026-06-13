"use client"

import { motion, useScroll, useSpring } from "motion/react"

// Thin reading-progress bar pinned to the top of the viewport.
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 })

  return (
    <motion.div
      style={{
        scaleX,
        transformOrigin: "0%",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        zIndex: 100,
        background: "linear-gradient(90deg, #6B7D5C, #E6A817)",
      }}
    />
  )
}
