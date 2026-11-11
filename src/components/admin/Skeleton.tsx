"use client"

// Shared loading placeholders for the admin app.
//
// Admin pages render these INSTEAD of a bare "Loading…" line so a page never
// paints a partial shape that jumps around once the data arrives: the table
// frame, tabs and action column all occupy their final space from the first
// frame. The shimmer itself lives in globals.css (.byt-skel) so it stays
// theme-aware in dark mode.

const MUTED = "var(--admin-muted)"

/** One shimmering bar. Width accepts any CSS length (number = px). */
export function Skeleton({
  width = "100%",
  height = 12,
  radius = 6,
  style,
}: {
  width?: number | string
  height?: number | string
  radius?: number
  style?: React.CSSProperties
}) {
  return <span className="byt-skel" style={{ width, height, borderRadius: radius, ...style }} />
}

/** Pseudo-random but stable width so rows look like text, not a grid. */
const widthFor = (row: number, col: number, cols: number) => {
  if (col === cols - 1) return "100%" // action column — buttons, fills its cell
  const spread = [68, 84, 55, 92, 73, 60, 88, 78]
  return `${spread[(row * cols + col) % spread.length]}%`
}

/**
 * A full list-table placeholder. Pass the SAME headers the real table uses so
 * the header row doesn't shift when real rows replace this.
 * `align` marks columns rendered right-aligned (e.g. totals, actions).
 */
export function TableSkeleton({
  headers,
  rows = 6,
  align = [],
}: {
  headers: string[]
  rows?: number
  align?: number[]
}) {
  const cols = headers.length
  return (
    <div style={{ overflowX: "auto" }} aria-busy="true" aria-live="polite">
      <span style={srOnly}>Loading…</span>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
        <thead>
          <tr style={{ background: "var(--admin-card-2)", fontSize: 12, color: MUTED, textAlign: "left" }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: "10px 14px", fontWeight: 600, textAlign: align.includes(i) ? "right" : "left" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r} style={{ borderTop: "1px solid var(--admin-border)" }}>
              {headers.map((_, c) => (
                <td key={c} style={{ padding: "14px" }}>
                  <Skeleton
                    width={widthFor(r, c, cols)}
                    height={11}
                    style={align.includes(c) ? { marginLeft: "auto" } : undefined}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Filter-tab pills placeholder, sized like the real pills. */
export function TabsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} width={[88, 150, 128, 76, 96][i % 5]} height={31} radius={999} />
      ))}
    </div>
  )
}

/** Stat/KPI tile row placeholder (dashboards, finance, analytics). */
export function StatCardsSkeleton({ count = 4, minWidth = 180 }: { count?: number; minWidth?: number }) {
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minWidth}px), 1fr))`, gap: 14 }}
      aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 16 }}>
          <Skeleton width="55%" height={10} />
          <Skeleton width="78%" height={22} style={{ marginTop: 12 }} />
        </div>
      ))}
    </div>
  )
}

/** Edit/amend form placeholder — label + input pairs in the usual 2-up grid. */
export function FormSkeleton({ fields = 6, lines = 3 }: { fields?: number; lines?: number }) {
  return (
    <div
      style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: "16px clamp(12px, 4vw, 20px)" }}
      aria-busy="true">
      <span style={srOnly}>Loading…</span>
      <Skeleton width={200} height={18} style={{ marginBottom: 18 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12 }}>
        {Array.from({ length: fields }, (_, i) => (
          <div key={i}>
            <Skeleton width={`${50 + ((i * 13) % 30)}%`} height={10} />
            <Skeleton height={38} radius={8} style={{ marginTop: 6 }} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, display: "grid", gap: 8 }}>
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} height={40} radius={8} />
        ))}
      </div>
    </div>
  )
}

/**
 * Whole-page placeholder for the admin shell (sidebar + header + content),
 * shown by AdminLayout while the session — and therefore the signed-in role —
 * is still resolving. Nothing role-dependent is rendered until it is known.
 */
export function AdminShellSkeleton() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--admin-bg)" }} aria-busy="true">
      <span style={srOnly}>Loading your workspace…</span>
      <aside
        className="admin-shell-skeleton-aside"
        style={{ width: 260, background: "var(--admin-sidebar)", flexShrink: 0, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26, opacity: 0.35 }}>
          <Skeleton width={110} height={84} radius={10} />
          <Skeleton width={56} height={26} />
        </div>
        <div style={{ display: "grid", gap: 10, opacity: 0.25 }}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height={34} radius={8} />
          ))}
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <header
          style={{ background: "var(--admin-card)", borderBottom: "1px solid var(--admin-border)", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
          <Skeleton width={22} height={16} />
          <Skeleton width={190} height={12} />
        </header>
        <main style={{ padding: "clamp(16px, 4vw, 28px)" }}>
          <Skeleton width={260} height={22} style={{ marginBottom: 20 }} />
          <StatCardsSkeleton count={4} />
          <div
            style={{ marginTop: 22, background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, overflow: "hidden" }}>
            <TableSkeleton headers={["", "", "", "", ""]} rows={5} />
          </div>
        </main>
      </div>
    </div>
  )
}

const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
}
