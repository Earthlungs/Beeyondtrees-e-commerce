// Pure, dependency-free constants for the livestock subsystem. Kept separate
// from any server helper so client components can import this metadata
// without pulling server code into the bundle. Mirrors lib/fungiculture-stages.ts.
// Unlike Fungiculture, livestock isn't a stage pipeline — it's ongoing
// housing/animal/feed/yield records, all owned by the `livestock_manager` role.

export const SPECIES = ["cattle", "goat", "sheep", "poultry", "pig", "rabbit", "bee", "other"] as const
export type Species = (typeof SPECIES)[number]

export const SPECIES_LABELS: Record<string, string> = {
  cattle: "Cattle", goat: "Goat", sheep: "Sheep", poultry: "Poultry",
  pig: "Pig", rabbit: "Rabbit", bee: "Bee (Apiary)", other: "Other",
}

export const HOUSING_TYPES = ["barn", "pen", "coop", "paddock", "pasture", "other"] as const
export const HOUSING_TYPE_LABELS: Record<string, string> = {
  barn: "Barn", pen: "Pen", coop: "Coop", paddock: "Paddock", pasture: "Pasture", other: "Other",
}

export const HEALTH_STATUSES = ["healthy", "sick", "quarantine", "deceased"] as const
export const ANIMAL_STATUSES = ["active", "sold", "deceased", "transferred"] as const

export const YIELD_TYPES = ["eggs", "milk", "meat", "offspring", "wool", "honey", "other"] as const
export const YIELD_TYPE_LABELS: Record<string, string> = {
  eggs: "Eggs", milk: "Milk", meat: "Meat", offspring: "Offspring", wool: "Wool", honey: "Honey", other: "Other",
}
export const YIELD_UNITS = ["kg", "liters", "units", "dozen"] as const
export const FEED_UNITS = ["kg", "bags", "liters"] as const

// Sole record-owning role, admin/assistant_ceo may act on anything — same
// convention as Fungiculture's STAGE_ROLES/isCeo checks.
export const LIVESTOCK_ROLE = "livestock_manager"
