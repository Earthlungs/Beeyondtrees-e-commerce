import { create } from "zustand"

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
}

interface ProductStore {
  products: Product[]
  loading: boolean
  loadProducts: () => Promise<void>
  addProduct: (product: Product) => Promise<void>
  updateProduct: (product: Product) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
}

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  loading: false,

  loadProducts: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/products')
      const products = await res.json()
      set({ products, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  addProduct: async (product) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    })
    const newProduct = await res.json()
    set({ products: [...get().products, newProduct] })
  },

  updateProduct: async (product) => {
    await fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    })
    set({ products: get().products.map(p => p.id === product.id ? product : p) })
  },

  deleteProduct: async (id) => {
    await fetch('/api/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    set({ products: get().products.filter(p => p.id !== id) })
  },
}))
