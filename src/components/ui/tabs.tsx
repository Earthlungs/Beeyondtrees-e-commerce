import * as React from "react"

export function Tabs({ children, defaultValue }: { children: React.ReactNode; defaultValue?: string }) {
  return <div>{children}</div>
}

export function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 border-b">{children}</div>
}

export function TabsTrigger({ children, value }: { children: React.ReactNode; value: string }) {
  return <button className="px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-gray-300">{children}</button>
}

export function TabsContent({ children, value }: { children: React.ReactNode; value: string }) {
  return <div className="pt-4">{children}</div>
}
