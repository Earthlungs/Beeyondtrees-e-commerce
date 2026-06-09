import * as React from "react"
import { cn } from "@/lib/utils"

interface AvatarProps {
  className?: string
  children?: React.ReactNode
  size?: "default" | "sm" | "lg"
}

export function Avatar({ className, children, size = "default", ...props }: AvatarProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
