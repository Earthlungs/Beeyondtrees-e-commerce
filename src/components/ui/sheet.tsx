import * as React from "react"
import { cn } from "@/lib/utils"

interface SheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export function Sheet({ children, open, onOpenChange }: SheetProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange?.(false)} />
      {children}
    </div>
  )
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "left" | "right" | "top" | "bottom"
}

export function SheetContent({ children, className, side = "right", style, ...props }: SheetContentProps) {
  return (
    <div style={style} {...props} className={cn(
      "fixed bg-white shadow-xl p-6 overflow-y-auto z-50",
      side === "right" ? "right-0 top-0 h-full w-[400px] max-w-[90vw]" : "",
      side === "left" ? "left-0 top-0 h-full w-[400px] max-w-[90vw]" : "",
      className
    )}>
      {children}
    </div>
  )
}

export function SheetHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>
}

export function SheetTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <h2 className="text-lg font-semibold" style={style}>{children}</h2>
}
