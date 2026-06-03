import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShoppingCart, TreePine } from "lucide-react"

export function Header() {
  return (
    <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50" style={{ borderColor: '#A89F91' }}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight" style={{ color: '#4A3F2F' }}>
          <TreePine className="h-7 w-7" style={{ color: '#6B7D5C' }} />
          <span>
            Beeyond<span style={{ color: '#6B7D5C' }}> Trees</span>
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/products" className="text-sm font-medium hover:text-[#6B7D5C] transition-colors" style={{ color: '#4A3F2F' }}>
            Shop All
          </Link>
          <Link href="/categories" className="text-sm font-medium hover:text-[#6B7D5C] transition-colors" style={{ color: '#4A3F2F' }}>
            Categories
          </Link>
          <Link href="/about" className="text-sm font-medium hover:text-[#6B7D5C] transition-colors" style={{ color: '#4A3F2F' }}>
            Our Mission
          </Link>
          <Link href="/blog" className="text-sm font-medium hover:text-[#6B7D5C] transition-colors" style={{ color: '#4A3F2F' }}>
            Blog
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="hover:text-[#6B7D5C]" style={{ color: '#4A3F2F' }}>
            <ShoppingCart className="h-5 w-5" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-[#6B7D5C] text-[#6B7D5C] hover:bg-[#6B7D5C] hover:text-white transition-colors"
          >
            Sign In
          </Button>
        </div>
      </div>
    </header>
  )
}
