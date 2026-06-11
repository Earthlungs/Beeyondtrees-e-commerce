import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuProps {
  children?: React.ReactNode
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  return <div className="relative">{children}</div>
}

export function DropdownMenuTrigger({ children }: DropdownMenuProps) {
  return <>{children}</>
}

export function DropdownMenuContent({ children, className }: DropdownMenuProps & { className?: string }) {
  return <div className={cn("absolute right-0 mt-2 bg-white rounded-md shadow-lg border p-2 min-w-[200px] z-50", className)}>{children}</div>
}

export function DropdownMenuItem({ children, onClick }: DropdownMenuProps & { onClick?: () => void }) {
  return <button onClick={onClick} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">{children}</button>
}
