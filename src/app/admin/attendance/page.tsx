"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Clock, LogIn, LogOut, Loader2, MapPin, AlertTriangle, Users } from "lucide-react"
import { LocationCell } from "@/components/admin/LocationMap"
import { formatDuration, nairobiDateKey } from "@/lib/attendance"
import { ROLE_LABELS, isAdminishRole } from "@/lib/tracing-stages"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const RED = "#C0392B"

interface Punch {
  id: string
  userId: string
  userName: string
  role: string
  type: "in" | "out"
  at: string
  latitude: number
  longitude: number
  accuracy: number | null
  address: string | null
  note: string | null
  workedMins: number | null
}

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })

// Browser GPS fix at the moment the button is pressed. `maximumAge: 0` forbids a
// cached position, so the punch always reflects where the user actually is.
function getFix(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This browser cannot read your location."))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    })
  })
}

function fixError(e: unknown): string {
  const err = e as GeolocationPositionError
  if (err && typeof err.code === "number") {
    if (err.code === 1) return "Location permission was denied. Allow location for this site in your browser settings, then try again."
    if (err.code === 2) return "Your location is unavailable right now. Move somewhere with a clearer signal and try again."
    if (err.code === 3) return "Getting your location timed out. Try again."
  }
  return (e as Error)?.message || "Could not read your location."
}

export default function AttendancePage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || ""
  const isAdmin = isAdminishRole(role)

  const [tab, setTab] = useState<"me" | "all">("me")
  const [mine, setMine] = useState<Punch[]>([])
  const [open, setOpen] = useState<Punch | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<"in" | "out" | null>(null)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")
  const [note, setNote] = useState("")

  const [all, setAll] = useState<Punch[]>([])
  const [allLoading, setAllLoading] = useState(false)
  const [date, setDate] = useState(() => nairobiDateKey(new Date()))

  const loadMine = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance")
      if (res.ok) {
        const data = await res.json()
        setMine(data.records ?? [])
        setOpen(data.open ?? null)
      }
    } finally { setLoading(false) }
  }, [])

  const loadAll = useCallback(async () => {
    setAllLoading(true)
    try {
      const res = await fetch(`/api/attendance?scope=all&date=${date}`)
      if (res.ok) setAll((await res.json()).records ?? [])
    } finally { setAllLoading(false) }
  }, [date])

  useEffect(() => { loadMine() }, [loadMine])

  // Fetched on the tab click rather than in an effect — the switch is a user
  // event, so there is nothing to synchronise on render.
  const openAllTab = () => { setTab("all"); loadAll() }

  const punch = async (type: "in" | "out") => {
    setError(""); setStatus("Getting your location…"); setBusy(type)
    try {
      const pos = await getFix()
      setStatus("Recording…")
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          note: note.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not record this."); return }
      setNote("")
      await loadMine()
      if (tab === "all") loadAll()
    } catch (e) {
      setError(fixError(e))
    } finally {
      setBusy(null); setStatus("")
    }
  }

  const todayKey = nairobiDateKey(new Date())
  const todaysPunches = mine.filter((p) => nairobiDateKey(p.at) === todayKey)

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Clock size={22} color={GREEN} />
        <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Attendance</h1>
      </div>

      {isAdmin && (
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <TabButton active={tab === "me"} onClick={() => setTab("me")} icon={<Clock size={15} />} label="My attendance" />
          <TabButton active={tab === "all"} onClick={openAllTab} icon={<Users size={15} />} label="All staff" />
        </div>
      )}

      {tab === "me" && (
        <>
          <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 22, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: open ? GREEN : "#B9B9B9", flexShrink: 0 }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>
                {open ? "You are signed in" : "You are signed out"}
              </span>
            </div>
            <p style={{ color: MUTED, fontSize: 13, margin: "0 0 16px" }}>
              {open
                ? `Signed in at ${timeOf(open.at)}${open.address ? ` from ${open.address}` : ""}.`
                : "Your live location is captured when you sign in and when you sign out."}
            </p>

            {error && (
              <div style={{ background: "#FBEAEA", color: "#9B2C2C", padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{error}</span>
              </div>
            )}

            <div style={{ maxWidth: 420, marginBottom: 12 }}>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note (e.g. field visit, working from the nursery)"
              />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Button
                onClick={() => punch(open ? "out" : "in")}
                disabled={busy !== null}
                style={{ background: open ? RED : GREEN, color: "white", gap: 8, height: 46, padding: "0 26px", fontSize: 15 }}
              >
                {busy
                  ? <><Loader2 size={17} className="animate-spin" /> {status || "Working…"}</>
                  : open
                    ? <><LogOut size={17} /> Sign Out</>
                    : <><LogIn size={17} /> Sign In</>}
              </Button>
              <span style={{ color: MUTED, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <MapPin size={13} /> Location is required — allow it when your browser asks.
              </span>
            </div>
          </div>

          <SectionTitle>Today</SectionTitle>
          <PunchTable rows={todaysPunches} loading={loading} empty="No sign in recorded yet today." showStaff={false} />

          <div style={{ height: 24 }} />
          <SectionTitle>Recent history</SectionTitle>
          <PunchTable
            rows={mine.filter((p) => nairobiDateKey(p.at) !== todayKey)}
            loading={loading}
            empty="No earlier attendance records."
            showStaff={false}
            showDate
          />
        </>
      )}

      {tab === "all" && isAdmin && (
        <>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <label style={{ display: "block" }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: TEXT, marginBottom: 4, display: "block" }}>Date</span>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 180 }} />
            </label>
            <Button onClick={loadAll} disabled={allLoading} style={{ background: GREEN, color: "white", height: 38 }}>
              {allLoading ? <Loader2 size={15} className="animate-spin" /> : "Refresh"}
            </Button>
            <span style={{ color: MUTED, fontSize: 12.5, marginLeft: "auto" }}>
              {all.length} record{all.length === 1 ? "" : "s"} · {new Set(all.map((p) => p.userId)).size} staff
            </span>
          </div>
          <PunchTable rows={all} loading={allLoading} empty="No attendance recorded on this date." showStaff />
        </>
      )}
    </div>
  )
}

function PunchTable({
  rows, loading, empty, showStaff, showDate,
}: {
  rows: Punch[]; loading: boolean; empty: string; showStaff: boolean; showDate?: boolean
}) {
  return (
    <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, overflow: "hidden" }}>
      {loading ? (
        <p style={{ padding: 24, color: MUTED }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ padding: 24, color: MUTED, textAlign: "center" }}>{empty}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr style={{ background: "var(--admin-card-2)", fontSize: 12, color: MUTED, textAlign: "left" }}>
                {showStaff && <th style={th}>Staff</th>}
                <th style={th}>Action</th>
                {showDate && <th style={th}>Date</th>}
                <th style={th}>Time</th>
                <th style={th}>Location</th>
                <th style={th}>Hours</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid var(--admin-border)", verticalAlign: "top" }}>
                  {showStaff && (
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{p.userName}</div>
                      <div style={{ color: MUTED, fontSize: 12 }}>{ROLE_LABELS[p.role] ?? p.role}</div>
                    </td>
                  )}
                  <td style={td}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999,
                      fontSize: 12, fontWeight: 700,
                      background: p.type === "in" ? "#E7F4EC" : "#FBEAEA",
                      color: p.type === "in" ? "#136B36" : "#9B2C2C",
                    }}>
                      {p.type === "in" ? <LogIn size={12} /> : <LogOut size={12} />}
                      {p.type === "in" ? "Signed in" : "Signed out"}
                    </span>
                    {p.note && <div style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>{p.note}</div>}
                  </td>
                  {showDate && <td style={td}>{nairobiDateKey(p.at)}</td>}
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{timeOf(p.at)}</td>
                  <td style={{ ...td, maxWidth: 280 }}>
                    <LocationCell
                      fix={p}
                      title={`${p.userName} — ${p.type === "in" ? "signed in" : "signed out"} at ${timeOf(p.at)}`}
                    />
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {p.type === "out" ? formatDuration(p.workedMins) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
        border: `1px solid ${active ? GREEN : "var(--admin-border)"}`,
        background: active ? GREEN : "var(--admin-card)",
        color: active ? "white" : TEXT, fontSize: 13, fontWeight: 600, cursor: "pointer",
      }}
    >
      {icon} {label}
    </button>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 10 }}>{children}</h2>
}

const th: React.CSSProperties = { padding: "10px 14px", fontWeight: 600 }
const td: React.CSSProperties = { padding: "10px 14px", fontSize: 13.5, color: TEXT }
