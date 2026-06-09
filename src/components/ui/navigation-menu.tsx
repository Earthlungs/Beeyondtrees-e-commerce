import * as React from "react"
import Link from "next/link"

export function NavigationMenu({ children }: { children: React.ReactNode }) {
  return <nav className="flex gap-4">{children}</nav>
}

export function NavigationMenuItem({ children, href }: { children: React.ReactNode; href: string }) {
  return <Link href={href} className="text-sm hover:underline">{children}</Link>
}
