"use client"

import { useEffect, useRef, useState } from "react"
import { useInView } from "motion/react"

// Counts up to `to` once it scrolls into view.
export function Counter({ to, duration = 1.8, className, style }: { to: number; duration?: number; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const ease = (p: number) => 1 - Math.pow(1 - p, 3)
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / (duration * 1000))
      setVal(Math.floor(ease(p) * to))
      if (p < 1) raf = requestAnimationFrame(tick)
      else setVal(to)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration])

  return <span ref={ref} className={className} style={style}>{val.toLocaleString()}</span>
}
