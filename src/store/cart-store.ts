import { create } from "zustand"

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
  pricingTier: "retail" | "wholesale" | "distributor"
  maxQuantity: number
  minQuantity?: number
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  addItem: (item: Omit<CartItem, 'quantity'> & { minQuantity?: number }) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  updatePricingTier: (id: string, tier: "retail" | "wholesale" | "distributor") => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

const tierDefaults: Record<string, number> = {
  retail: 1,
  wholesale: 12,
  distributor: 37,
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,
  
  setIsOpen: (open) => set({ isOpen: open }),
  
  addItem: (item) => {
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id && i.pricingTier === item.pricingTier)
      const minQty = item.minQuantity || tierDefaults[item.pricingTier] || 1
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id && i.pricingTier === item.pricingTier
              ? { ...i, quantity: Math.min(i.quantity + 1, i.maxQuantity) }
              : i
          ),
        }
      }
      return { items: [...state.items, { ...item, quantity: minQty }] }
    })
  },
  
  removeItem: (id) => {
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
  },
  
  updateQuantity: (id, quantity) => {
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, quantity: Math.max(i.minQuantity || 1, Math.min(quantity, i.maxQuantity)) } : i)),
    }))
  },
  
  updatePricingTier: (id, tier) => {
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, pricingTier: tier } : i)),
    }))
  },
  
  clearCart: () => set({ items: [] }),
  
  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  },
  
  getItemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0)
  },
}))
