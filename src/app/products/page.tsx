"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { ProductGrid } from "@/components/products/ProductGrid"
import { ProductFilters } from "@/components/products/ProductFilters"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { SlidersHorizontal, X } from "lucide-react"

function ProductsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlCategory = searchParams.get('category') || "All"
  
  const [selectedCategory, setSelectedCategory] = useState(urlCategory)
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (urlCategory !== selectedCategory) {
      setSelectedCategory(urlCategory)
    }
  }, [urlCategory])

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    if (category === "All") {
      router.push('/products')
    } else {
      router.push(`/products?category=${encodeURIComponent(category)}`)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F1E8' }}>
      <Header />
      <main className="px-4 py-6" style={{ maxWidth: '100%' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#4A3F2F' }}>
              {selectedCategory !== "All" ? selectedCategory : 'Our Products'}
            </h1>
            <p className="text-sm" style={{ color: '#A89F91' }}>
              {selectedCategory !== "All" 
                ? `Browse our ${selectedCategory.toLowerCase()} collection` 
                : 'Natural products that go beeyond expectations'}
            </p>
          </div>
          <Button 
            variant="outline" 
            className="lg:hidden flex items-center gap-2"
            style={{ borderColor: '#6B7D5C', color: '#6B7D5C' }}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? <X size={16} /> : <SlidersHorizontal size={16} />}
            Filters
          </Button>
        </div>
        
        <div className="flex gap-6">
          {/* Sidebar filters - desktop always visible, mobile toggle */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-56 flex-shrink-0`}>
            <ProductFilters 
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
              selectedPrice={selectedPrice}
              onPriceChange={setSelectedPrice}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </aside>
          <div className="flex-1 min-w-0">
            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid category={selectedCategory !== "All" ? selectedCategory : undefined} />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  )
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4">
          <Skeleton className="h-48 w-full rounded-lg mb-4" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductsContent />
    </Suspense>
  )
}
