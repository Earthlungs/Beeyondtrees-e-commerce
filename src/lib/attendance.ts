// Shared, dependency-free constants and date maths for the attendance
// (sign in / sign out) and leave subsystems. No prisma / next-auth imports, so
// client components can use it without pulling server code into the bundle.

// Operations are in Kenya — Africa/Nairobi is UTC+3 with no DST, so a fixed
// offset is exact. The server runs in UTC, so "today" must be computed against
// this offset or an 08:00 EAT sign-in lands on the previous UTC day.
export const NAIROBI_OFFSET_MIN = 180

const DAY_MS = 86_400_000

// The UTC instants bounding a Nairobi calendar day. `dateStr` is "yyyy-mm-dd"
// (as sent by <input type="date">); omit it for today.
export function nairobiDayRange(dateStr?: string | null): { start: Date; end: Date } {
  let y: number, m: number, d: number
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [ys, ms, ds] = dateStr.split("-")
    y = Number(ys); m = Number(ms) - 1; d = Number(ds)
  } else {
    const shifted = new Date(Date.now() + NAIROBI_OFFSET_MIN * 60_000)
    y = shifted.getUTCFullYear(); m = shifted.getUTCMonth(); d = shifted.getUTCDate()
  }
  const start = new Date(Date.UTC(y, m, d) - NAIROBI_OFFSET_MIN * 60_000)
  return { start, end: new Date(start.getTime() + DAY_MS) }
}

// "yyyy-mm-dd" for a given instant, in Nairobi local time.
export function nairobiDateKey(at: Date | string): string {
  const d = new Date(at)
  return new Date(d.getTime() + NAIROBI_OFFSET_MIN * 60_000).toISOString().slice(0, 10)
}

export function formatDuration(mins: number | null | undefined): string {
  if (mins === null || mins === undefined || !Number.isFinite(mins) || mins < 0) return "—"
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ── Leave ──────────────────────────────────────────────────────────────────

export const LEAVE_TYPES = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "compassionate", label: "Compassionate Leave" },
  { value: "study", label: "Study Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "other", label: "Other" },
] as const

export const LEAVE_TYPE_VALUES = LEAVE_TYPES.map((t) => t.value) as readonly string[]

export function leaveTypeLabel(value: string): string {
  return LEAVE_TYPES.find((t) => t.value === value)?.label ?? value
}

export const LEAVE_STATUS_LABELS: Record<string, string> = {
  pending: "Pending CEO approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
}

// Inclusive day count between two dates (a one-day leave = 1 day). Counted in
// whole UTC days from the date parts alone, so it is unaffected by the server's
// timezone.
export function countLeaveDays(start: Date, end: Date): number {
  const a = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  const b = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  return Math.max(1, Math.round((b - a) / DAY_MS) + 1)
}

// Parse a "yyyy-mm-dd" input into a UTC-midnight Date. Anything unparseable
// (browsers without a native date picker let users type free text) → null.
export function parseDayInput(v: unknown): Date | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const d = new Date(`${v}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}
