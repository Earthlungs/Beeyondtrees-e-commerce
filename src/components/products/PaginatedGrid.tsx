"use client"

import { motion, AnimatePresence, useReducedMotion, type Variants } from "motion/react"
import { ProductCard } from "@/components/shared/ProductCard"
import type { Product } from "@/store/product-store"

// A dramatic, direction-aware page transition for the product grid. The old
// page swings + blurs out to one side while the new page flies in from the
// other, and each card pops in on a springy 3D flip stagger. `direction` is
// +1 when paging forward, -1 when paging back, 0 on first paint.
export function PaginatedGrid({
  products,
  page,
  direction,
}: {
  products: Product[]
  page: number
  direction: number
}) {
  const reduce = useReducedMotion()

  // The whole grid: a blurred 3D sweep in the paging direction.
  const gridVariants: Variants = reduce
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1, transition: { duration: 0.25, staggerChildren: 0.01 } },
        exit: { opacity: 0, transition: { duration: 0.2 } },
      }
    : {
        enter: (dir: number) => ({
          opacity: 0,
          x: dir >= 0 ? 160 : -160,
          rotateY: dir >= 0 ? -22 : 22,
          scale: 0.9,
          filter: "blur(12px)",
        }),
        center: {
          opacity: 1,
          x: 0,
          rotateY: 0,
          scale: 1,
          filter: "blur(0px)",
          transition: {
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
            when: "beforeChildren",
            staggerChildren: 0.055,
          },
        },
        exit: (dir: number) => ({
          opacity: 0,
          x: dir >= 0 ? -160 : 160,
          rotateY: dir >= 0 ? 22 : -22,
          scale: 0.9,
          filter: "blur(12px)",
          transition: { duration: 0.32, ease: [0.55, 0, 0.45, 1] },
        }),
      }

  // Each card: a springy pop with a 3D tumble.
  const cardVariants: Variants = reduce
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: { opacity: 0, y: 64, scale: 0.55, rotateX: -55 },
        center: {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          transition: { type: "spring", stiffness: 320, damping: 22, mass: 0.7 },
        },
        exit: { opacity: 0, scale: 0.7, y: -24, transition: { duration: 0.22 } },
      }

  return (
    <div style={{ perspective: 1400, transformStyle: "preserve-3d" }}>
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={page}
          custom={direction}
          variants={gridVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          style={{ perspective: 1000, transformStyle: "preserve-3d", willChange: "transform, opacity, filter" }}
        >
          {products.map((product) => (
            <motion.div key={product.id} variants={cardVariants} style={{ transformStyle: "preserve-3d" }}>
              <ProductCard product={product} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
