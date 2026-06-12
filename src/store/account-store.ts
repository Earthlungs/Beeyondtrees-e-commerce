import { create } from "zustand"
import { persist } from "zustand/middleware"

// Lightweight customer account — defaults to guest. Distinct from the admin
// NextAuth session and the B2B staff portal. A shopper can create a local
// profile to personalise the experience (name shown in the header, etc.).
export interface Customer {
  name: string
  email: string
  picture?: string
}

interface AccountStore {
  customer: Customer | null
  signUp: (c: Customer) => void
  signOut: () => void
}

export const useAccountStore = create<AccountStore>()(
  persist(
    (set) => ({
      customer: null,
      signUp: (c) => set({ customer: c }),
      signOut: () => set({ customer: null }),
    }),
    { name: "byt-account" }
  )
)
