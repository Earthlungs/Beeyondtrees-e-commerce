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
  costPrice?: number // admin-only; never in the public catalog or cached store
  stock: number
  images?: string[] // omitted from the catalog list; loaded on the detail page
  isOnOffer: boolean
  offerPrice: number | null // retail offer price
  offerWholesalePrice?: number | null
  offerDistributorPrice?: number | null
  isFeatured?: boolean
  createdAt?: string
  updatedAt?: string
}

export const slugify = (name: string) => name.toLowerCase().replace(/\s+/g, "-")

export type PricingTier = "retail" | "wholesale" | "distributor"

// The price a customer actually pays for a tier: the offer price when the
// product is on offer (and a valid offer price is set for that tier), otherwise
// the normal tier price. Untick the offer → everything falls back to normal.
export const regularPrice = (p: Product, tier: PricingTier) =>
  tier === "wholesale" ? p.wholesalePrice : tier === "distributor" ? p.distributorPrice : p.retailPrice

export const offerPriceFor = (p: Product, tier: PricingTier): number | null => {
  const o = tier === "wholesale" ? p.offerWholesalePrice : tier === "distributor" ? p.offerDistributorPrice : p.offerPrice
  return o != null && o > 0 ? o : null
}

export const effectivePrice = (p: Product, tier: PricingTier): number => {
  const offer = p.isOnOffer ? offerPriceFor(p, tier) : null
  return offer ?? regularPrice(p, tier)
}

// Discount as a whole-number percent for a tier (0 if not a real discount).
export const discountPercent = (p: Product, tier: PricingTier): number => {
  const offer = p.isOnOffer ? offerPriceFor(p, tier) : null
  const reg = regularPrice(p, tier)
  if (!offer || reg <= 0 || offer >= reg) return 0
  return Math.round((1 - offer / reg) * 100)
}

// Typo/partial-tolerant search: matches if the query is a substring, or every
// query word is a substring OR an in-order subsequence of the text (e.g.
// "cofee mug" → "Coffee Mug").
export const fuzzyMatch = (query: string, text: string): boolean => {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const t = text.toLowerCase()
  if (t.includes(q)) return true
  return q.split(/\s+/).every((word) => {
    if (t.includes(word)) return true
    if (word.length < 3) return false
    let i = 0
    for (const ch of t) { if (ch === word[i] && ++i === word.length) return true }
    return false
  })
}

// Keep only hosted (Cloudinary) URLs for the lightweight cached copy; base64
// data-URIs are dropped (kept out of localStorage) and rendered via the
// /api/products/[id]/image fallback instead. Positions are preserved with "".
export const urlImages = (images?: string[]) =>
  (images ?? []).map((s) => (/^https?:\/\//.test(s) ? s : ""))

// Inject Cloudinary delivery transforms — f_auto (serve AVIF/WebP), q_auto
// (auto compression), and an optional max width (c_limit = downscale-only,
// aspect preserved) — so we deliver modern, right-sized images instead of
// full-res originals. No-op for any non-Cloudinary URL.
export const cldUrl = (url: string, width?: number) => {
  const marker = "/upload/"
  if (!url.includes("res.cloudinary.com") || !url.includes(marker)) return url
  const t = ["f_auto", "q_auto", ...(width ? ["c_limit", `w_${width}`] : [])].join(",")
  return url.replace(marker, `${marker}${t}/`)
}

// URL for a product's Nth image. When the catalog already carries a hosted
// (Cloudinary) URL we return it directly (with delivery transforms) so the
// browser loads an optimized image from the CDN with no DB round-trip. Pass
// `width` to right-size for the slot (cards ~500, gallery ~1200). Otherwise we
// fall back to the image API route, cache-busted by `updatedAt` (that endpoint
// caches immutably, so `?v=` refreshes edits).
export const productImageUrl = (
  product: Pick<Product, "id" | "updatedAt" | "images">,
  i = 0,
  width?: number
) => {
  const direct = product.images?.[i]
  if (direct && /^https?:\/\//.test(direct)) return cldUrl(direct, width)

  const params = new URLSearchParams()
  if (i) params.set("i", String(i))
  if (product.updatedAt) params.set("v", product.updatedAt)
  const qs = params.toString()
  return `/api/products/${product.id}/image${qs ? `?${qs}` : ""}`
}

// Highest updatedAt in the list, used as the incremental-sync watermark.
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
        // Keep only hosted URLs in the cached copy (base64 stays out of localStorage);
        // drop costPrice so the sensitive cost never lands in the public store.
        const light: Product = { ...created, images: urlImages(created.images), costPrice: undefined }
        const merged = sortByNewest([...get().products, light])
        set({ products: merged, lastSync: watermark(merged) || get().lastSync })
      },

      updateProduct: async (product) => {
        const res = await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product),
        })
        // Use the server's response so the fresh `updatedAt` is stored — it's the
        // cache-busting key for the image endpoints, so without it the storefront
        // would keep serving the old (immutably cached) image.
        const updated: Product = await res.json()
        const light: Product = { ...updated, images: urlImages(updated.images), costPrice: undefined }
        const merged = get().products.map((p) => (p.id === product.id ? light : p))
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
