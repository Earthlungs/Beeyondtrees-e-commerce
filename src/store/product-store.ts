import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Product {
  id: string
  name: string
  description: string
  category: string
  retailPrice: number
  wholesalePrice: number
  distributorPrice: number
  stock: number
  images: string[]
  isOnOffer: boolean
  offerPrice: number | null
  isFeatured?: boolean
  createdAt?: string
  updatedAt?: string
}

export const slugify = (name: string) => name.toLowerCase().replace(/\s+/g, "-")

// Highest updatedAt in the list — used as the incremental-sync watermark.
// Derived from server timestamps so it's immune to client clock skew.
const watermark = (list: Product[]) =>
  list.reduce((max, p) => (p.updatedAt && p.updatedAt > max ? p.updatedAt : max), "")

const sortByNewest = (list: Product[]) =>
  [...list].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))

interface ProductStore {
  products: Product[]
  lastSync: string | null
  loading: boolean
  loadProducts: (force?: boolean) => Promise<void>
  getBySlug: (slug: string) => Product | undefined
  addProduct: (product: Product) => Promise<void>
  updateProduct: (product: Product) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
}

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      products: [],
      lastSync: null,
      loading: false,

      // Stale-while-revalidate: cached products (rehydrated from localStorage)
      // render immediately; we then fetch only what changed since lastSync and
      // merge it in. A full refresh is forced when there's no cache or force=true.
      loadProducts: async (force = false) => {
        const cached = get().products
        const since = force || cached.length === 0 ? null : get().lastSync
        set({ loading: cached.length === 0 })
        try {
          const url = since ? `/api/products?since=${encodeURIComponent(since)}` : "/api/products"
          const res = await fetch(url)
          const incoming: Product[] = await res.json()
          if (!Array.isArray(incoming)) {
            set({ loading: false })
            return
          }

          let merged: Product[]
          if (since) {
            const byId = new Map(get().products.map((p) => [p.id, p]))
            incoming.forEach((p) => byId.set(p.id, p)) // upsert new/updated
            merged = sortByNewest(Array.from(byId.values()))
          } else {
            merged = sortByNewest(incoming)
          }
          set({
            products: merged,
            lastSync: watermark(merged) || get().lastSync,
            loading: false,
          })
        } catch {
          set({ loading: false })
        }
      },

      getBySlug: (slug) => get().products.find((p) => slugify(p.name) === slug),

      addProduct: async (product) => {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product),
        })
        const created: Product = await res.json()
        const merged = sortByNewest([...get().products, created])
        set({ products: merged, lastSync: watermark(merged) || get().lastSync })
      },

      updateProduct: async (product) => {
        await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product),
        })
        const merged = get().products.map((p) => (p.id === product.id ? product : p))
        set({ products: merged, lastSync: watermark(merged) || get().lastSync })
      },

      deleteProduct: async (id) => {
        await fetch("/api/products", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        })
        set({ products: get().products.filter((p) => p.id !== id) })
      },
    }),
    {
      name: "beeyond-trees-products",
      partialize: (s) => ({ products: s.products, lastSync: s.lastSync }),
    }
  )
)
