import { Header } from "@/components/layout/Header"
import { ProductGrid } from "@/components/products/ProductGrid"
import { ProductFilters } from "@/components/products/ProductFilters"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProductsPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F1E8' }}>
      <Header />
      <main className="px-4 py-6" style={{ maxWidth: '100%' }}>
        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ color: '#4A3F2F' }}>Our Products</h1>
          <p className="text-base" style={{ color: '#A89F91' }}>Natural products that go beeyond expectations</p>
        </div>
        
        <div className="flex gap-6">
          <aside className="w-56 flex-shrink-0 hidden lg:block">
            <ProductFilters />
          </aside>
          <div className="flex-1 min-w-0">
            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid />
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
