import * as React from "react"

interface SelectProps {
  children?: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
}

export function Select({ children }: SelectProps) {
  return <div className="relative">{children}</div>
}

export function SelectTrigger({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between border rounded-md px-3 py-2 cursor-pointer bg-white">{children}</div>
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span className="text-sm text-gray-500">{placeholder}</span>
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-50 w-full">{children}</div>
}

export function SelectItem({ children, value }: { children: React.ReactNode; value: string }) {
  return <div className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer">{children}</div>
}
