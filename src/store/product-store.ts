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
  loadProducts: () => void
  addProduct: (product: Product) => void
  updateProduct: (product: Product) => void
  deleteProduct: (id: string) => void
}

const STORAGE_KEY = 'beeyond-trees-products'

const getProducts = (): Product[] => {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

const saveProducts = (products: Product[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
}

export const useProductStore = create<ProductStore>((set, get) => ({
  products: typeof window !== 'undefined' ? getProducts() : [],
  
  loadProducts: () => {
    set({ products: getProducts() })
  },
  
  addProduct: (product) => {
    const current = get().products
    const updated = [...current, product]
    saveProducts(updated)
    set({ products: updated })
  },
  
  updateProduct: (product) => {
    const current = get().products
    const updated = current.map((p) => (p.id === product.id ? product : p))
    saveProducts(updated)
    set({ products: updated })
  },
  
  deleteProduct: (id) => {
    const current = get().products
    const updated = current.filter((p) => p.id !== id)
    saveProducts(updated)
    set({ products: updated })
  },
}))
