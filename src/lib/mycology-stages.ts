// Pure, dependency-free constants for the mycology (mushroom) pipeline. Kept
// separate from lib/mycology.ts (which imports prisma/next-auth) so client
// components can import the stage metadata without pulling server code into
// the bundle. Mirrors lib/tracing-stages.ts.

export const STAGES = [
  "substrate_prep",
  "incubation",
  "harvest",
  "dehydration_packaging",
] as const

export type Stage = (typeof STAGES)[number]

// A single role — fungiculturist — owns every stage. `admin` (CEO) and
// `assistant_ceo` (COO, CEO-equivalent) may act on any stage.
export const STAGE_ROLES: Record<Stage, string> = {
  substrate_prep: "fungiculturist",
  incubation: "fungiculturist",
  harvest: "fungiculturist",
  dehydration_packaging: "fungiculturist",
}

export const STAGE_LABELS: Record<Stage, string> = {
  substrate_prep: "Substrate Preparation",
  incubation: "Incubation",
  harvest: "Harvest",
  dehydration_packaging: "Dehydration & Packaging",
}

export function isStage(v: unknown): v is Stage {
  return typeof v === "string" && (STAGES as readonly string[]).includes(v)
}

export function stageIndex(stage: string): number {
  return (STAGES as readonly string[]).indexOf(stage)
}

// Advance to the next stage; null when the last stage clears (→ completed).
export function nextStage(stage: Stage): Stage | null {
  const i = stageIndex(stage)
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null
}
