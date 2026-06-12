"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform, useSpring } from "motion/react"

// Dramatic scroll-linked image: as it travels through the viewport the photo
// parallaxes, breathes in scale, and tilts, a bold, "alive" scroll effect.
// The inner image is oversized so the parallax never reveals an empty edge.
export function ParallaxImage({
  src, alt, aspectRatio = "4/5", radius = 24, intensity = 1,
}: {
  src: string
  alt: string
  aspectRatio?: string
  radius?: number
  intensity?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })

  // Smooth the scroll value so the motion feels fluid, not jittery.
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })

  const y = useTransform(p, [0, 1], [`${-14 * intensity}%`, `${14 * intensity}%`])
  const scale = useTransform(p, [0, 0.5, 1], [1.35, 1.12, 1.35])
  const rotate = useTransform(p, [0, 0.5, 1], [-4 * intensity, 0, 4 * intensity])
  const containerRotate = useTransform(p, [0, 0.5, 1], [3 * intensity, 0, -3 * intensity])

  return (
    <motion.div
      ref={ref}
      style={{
        position: "relative", overflow: "hidden", borderRadius: radius, aspectRatio,
        rotate: containerRotate,
        boxShadow: "0 40px 70px -40px rgba(74,63,47,0.5)",
      }}
    >
      <motion.img
        src={src}
        alt={alt}
        style={{
          position: "absolute", inset: "-18%", width: "136%", height: "136%",
          objectFit: "cover", y, scale, rotate, willChange: "transform",
        }}
      />
    </motion.div>
  )
}
