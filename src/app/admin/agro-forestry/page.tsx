"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Trees, Loader2, Search, X, Users, Map as MapIcon, PackageOpen, Sprout, Boxes,
  ChevronLeft, ChevronRight, Phone, Mail, IdCard, UserPlus,
} from "lucide-react"
import FarmerForm from "./farmer-form"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const CARD = "var(--admin-card)"
const BORDER = "1px solid var(--admin-border)"
const GREEN = "#6B7D5C"
const BROWN = "#8C6A4A"

const field: React.CSSProperties = {
  width: "100%", height: 38, borderRadius: 8, border: BORDER, padding: "0 10px", color: TEXT,
  background: CARD, fontSize: 13,
}
const th: React.CSSProperties = {
  textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
  color: MUTED, padding: "10px 12px", whiteSpace: "nowrap", borderBottom: BORDER,
}
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 13, color: TEXT, borderBottom: BORDER }

interface Summary {
  farmers: number
  acresCommitted: number
  disbursements: number
  beehives: number
  seedlings: number
  counties: { name: string; count: number }[]
  projectTypes: { name: string; count: number }[]
}

interface FarmerRow {
  id: number
  fullname: string
  gender: string
  group: string | null
  email: string | null
  phoneNumber: string | null
  county: string
  subCounty: string | null
  projectType: string
  landOwnershipType: string
  idNumber: string
  numberOfAcresCommitted: number | null
  disbursementCount: number
  beehivesReceived: number
  seedlingsReceived: number
}

interface DisbursementRow {
  id: number
  disbursedBy: string
  itemDisbursed: string
  disbursementCentre: string
  disbursementDate: string
  farmer: { id: number; fullname: string; county: string; phoneNumber: string | null }
  beehiveCount: number
  seedlingCount: number
}

interface FarmerDetail extends Omit<FarmerRow, "disbursementCount" | "beehivesReceived" | "seedlingsReceived"> {
  disbursements: {
    id: number
    disbursedBy: string
    itemDisbursed: string
    disbursementCentre: string
    disbursementDate: string
    beehives: { id: number; beehive: { id: number; beehiveId: string; beehiveType: string } }[]
    seedlings: { id: number; quantity: number; seedling: { id: number; seedlingSpicies: string } }[]
  }[]
}

// Source enum public."BeehiveType", spelled out for the UI.
const HIVE_TYPES: Record<string, string> = {
  LANGSSTROTH: "Langstroth",
  KTBH: "KTBH",
  CATCHER_BOX: "Catcher box",
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })
const fmtNum = (n: number) => n.toLocaleString("en-KE")

function Stat({ icon: Icon, label, value, tint }: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string; value: string; tint: string
}) {
  return (
    <div style={{ background: CARD, border: BORDER, borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: `${tint}1A`, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon size={18} color={tint} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: TEXT, lineHeight: 1.15 }}>{value}</div>
        <div style={{ fontSize: 11, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      </div>
    </div>
  )
}

export default function AgroForestryBoard() {
  const [tab, setTab] = useState<"farmers" | "disbursements">("farmers")
  const [summary, setSummary] = useState<Summary | null>(null)

  // Farmers tab
  const [q, setQ] = useState("")
  const [county, setCounty] = useState("")
  const [projectType, setProjectType] = useState("")
  const [page, setPage] = useState(1)
  const [farmers, setFarmers] = useState<FarmerRow[]>([])
  const [farmerTotal, setFarmerTotal] = useState(0)
  const [farmerPages, setFarmerPages] = useState(1)

  // Disbursements tab
  const [dPage, setDPage] = useState(1)
  const [disb, setDisb] = useState<DisbursementRow[]>([])
  const [disbTotal, setDisbTotal] = useState(0)
  const [disbPages, setDisbPages] = useState(1)

  const [detail, setDetail] = useState<FarmerDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  // Bumped after a registration so the table and the stat tiles both refetch.
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    fetch("/api/agro-forestry/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSummary(d))
      .catch(() => {})
  }, [refresh])

  // Debounce the search box so typing does not fire a request per keystroke.
  const [debouncedQ, setDebouncedQ] = useState("")
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [q])

  // Everything that identifies "which page of which table are we looking at".
  // `loading` is derived from it rather than toggled by hand: the spinner shows
  // whenever the data on screen belongs to a different query than the current
  // one, which covers the first load, tab switches, paging and filtering
  // without a setState in the effect body (react-hooks/set-state-in-effect).
  const queryKey = tab === "farmers"
    ? `farmers|${page}|${debouncedQ}|${county}|${projectType}|${refresh}`
    : `disbursements|${dPage}|${refresh}`
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const loading = loadedKey !== queryKey

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (tab === "farmers") {
        const sp = new URLSearchParams({ page: String(page) })
        if (debouncedQ) sp.set("q", debouncedQ)
        if (county) sp.set("county", county)
        if (projectType) sp.set("projectType", projectType)
        const res = await fetch(`/api/agro-forestry/farmers?${sp}`).catch(() => null)
        if (cancelled || !res?.ok) return
        const d = await res.json()
        if (cancelled) return
        setFarmers(d.rows); setFarmerTotal(d.total); setFarmerPages(d.pages)
      } else {
        const res = await fetch(`/api/agro-forestry/disbursements?page=${dPage}`).catch(() => null)
        if (cancelled || !res?.ok) return
        const d = await res.json()
        if (cancelled) return
        setDisb(d.rows); setDisbTotal(d.total); setDisbPages(d.pages)
      }
    }
    // Mark the key loaded even if the request failed, so a dead endpoint shows
    // the empty state instead of spinning forever.
    run().finally(() => { if (!cancelled) setLoadedKey(queryKey) })
    return () => { cancelled = true }
  }, [queryKey, tab, page, debouncedQ, county, projectType, dPage])

  const openFarmer = async (id: number) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/agro-forestry/farmers/${id}`)
      if (res.ok) setDetail(await res.json())
    } finally { setDetailLoading(false) }
  }

  const hasFilters = Boolean(q || county || projectType)

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Trees size={22} color={GREEN} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Agro Forestry</h1>
            <p style={{ fontSize: 12, color: MUTED }}>Farmer register and item handovers — beehives and seedlings disbursed in the field</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} style={{ background: GREEN, color: "white", gap: 6, height: 36, fontSize: 13 }}>
          <UserPlus size={15} /> Register Farmer
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 18 }}>
        <Stat icon={Users} label="Farmers enrolled" value={summary ? fmtNum(summary.farmers) : "—"} tint={GREEN} />
        <Stat icon={MapIcon} label="Acres committed" value={summary ? fmtNum(Math.round(summary.acresCommitted)) : "—"} tint={BROWN} />
        <Stat icon={PackageOpen} label="Disbursements" value={summary ? fmtNum(summary.disbursements) : "—"} tint="#3F5E2E" />
        <Stat icon={Boxes} label="Beehives handed out" value={summary ? fmtNum(summary.beehives) : "—"} tint="#A8762C" />
        <Stat icon={Sprout} label="Seedlings handed out" value={summary ? fmtNum(summary.seedlings) : "—"} tint={GREEN} />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, borderBottom: BORDER }}>
        {(["farmers", "disbursements"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "9px 14px", fontSize: 13,
              fontWeight: tab === t ? 700 : 500, color: tab === t ? TEXT : MUTED,
              borderBottom: tab === t ? `2px solid ${GREEN}` : "2px solid transparent", marginBottom: -1,
              textTransform: "capitalize",
            }}
          >
            {t} {t === "farmers" ? `(${fmtNum(farmerTotal)})` : `(${fmtNum(disbTotal)})`}
          </button>
        ))}
      </div>

      {tab === "farmers" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
          <div style={{ position: "relative" }}>
            <Search size={15} color={MUTED} style={{ position: "absolute", left: 10, top: 11, pointerEvents: "none" }} />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, ID number, phone, group…"
              style={{ ...field, paddingLeft: 32 }}
            />
          </div>
          <select style={field} value={county} onChange={(e) => { setCounty(e.target.value); setPage(1) }}>
            <option value="">All counties</option>
            {summary?.counties.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
          </select>
          <select style={field} value={projectType} onChange={(e) => { setProjectType(e.target.value); setPage(1) }}>
            <option value="">All project types</option>
            {summary?.projectTypes.map((p) => <option key={p.name} value={p.name}>{p.name} ({p.count})</option>)}
          </select>
          {hasFilters && (
            <Button
              onClick={() => { setQ(""); setCounty(""); setProjectType(""); setPage(1) }}
              style={{ background: CARD, color: TEXT, border: BORDER, height: 38, fontSize: 13, gap: 6 }}
            >
              <X size={14} /> Clear
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
      ) : tab === "farmers" ? (
        farmers.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: MUTED, fontSize: 13 }}>
            {hasFilters ? "No farmers match those filters." : "No farmers yet — run the import to bring the register across."}
          </div>
        ) : (
          <div style={{ background: CARD, border: BORDER, borderRadius: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={th}>Farmer</th>
                  <th style={th}>ID No.</th>
                  <th style={th}>Contact</th>
                  <th style={th}>County</th>
                  <th style={th}>Project</th>
                  <th style={th}>Land</th>
                  <th style={{ ...th, textAlign: "right" }}>Acres</th>
                  <th style={{ ...th, textAlign: "right" }}>Hives</th>
                  <th style={{ ...th, textAlign: "right" }}>Seedlings</th>
                </tr>
              </thead>
              <tbody>
                {farmers.map((f) => (
                  <tr key={f.id} onClick={() => openFarmer(f.id)} style={{ cursor: "pointer" }}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{f.fullname}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>
                        {f.gender}{f.group ? ` · ${f.group}` : ""}
                      </div>
                    </td>
                    <td style={{ ...td, fontSize: 12, color: MUTED }}>{f.idNumber}</td>
                    <td style={{ ...td, fontSize: 12 }}>
                      {f.phoneNumber || <span style={{ color: MUTED }}>—</span>}
                    </td>
                    <td style={td}>
                      {f.county}
                      {f.subCounty && <div style={{ fontSize: 11, color: MUTED }}>{f.subCounty}</div>}
                    </td>
                    <td style={td}>
                      <span style={{ background: GREEN, color: "white", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 999 }}>
                        {f.projectType}
                      </span>
                    </td>
                    <td style={{ ...td, fontSize: 12, color: MUTED }}>{f.landOwnershipType}</td>
                    <td style={{ ...td, textAlign: "right" }}>{f.numberOfAcresCommitted ?? "—"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{fmtNum(f.beehivesReceived)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{fmtNum(f.seedlingsReceived)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : disb.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED, fontSize: 13 }}>No disbursements recorded yet.</div>
      ) : (
        <div style={{ background: CARD, border: BORDER, borderRadius: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
            <thead>
              <tr>
                <th style={th}>Date</th>
                <th style={th}>Farmer</th>
                <th style={th}>Item</th>
                <th style={th}>Centre</th>
                <th style={th}>Disbursed by</th>
                <th style={{ ...th, textAlign: "right" }}>Hives</th>
                <th style={{ ...th, textAlign: "right" }}>Seedlings</th>
              </tr>
            </thead>
            <tbody>
              {disb.map((d) => (
                <tr key={d.id} onClick={() => openFarmer(d.farmer.id)} style={{ cursor: "pointer" }}>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDate(d.disbursementDate)}</td>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{d.farmer.fullname}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>{d.farmer.county}</div>
                  </td>
                  <td style={td}>{d.itemDisbursed}</td>
                  <td style={{ ...td, fontSize: 12, color: MUTED }}>{d.disbursementCentre}</td>
                  <td style={{ ...td, fontSize: 12, color: MUTED }}>{d.disbursedBy}</td>
                  <td style={{ ...td, textAlign: "right" }}>{d.beehiveCount || "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}>{d.seedlingCount || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && (tab === "farmers" ? farmerPages : disbPages) > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 14, fontSize: 13, color: MUTED }}>
          <Button
            disabled={(tab === "farmers" ? page : dPage) <= 1}
            onClick={() => (tab === "farmers" ? setPage((p) => p - 1) : setDPage((p) => p - 1))}
            style={{ background: CARD, color: TEXT, border: BORDER, height: 32, fontSize: 12, gap: 4 }}
          >
            <ChevronLeft size={14} /> Prev
          </Button>
          <span>Page {tab === "farmers" ? page : dPage} of {tab === "farmers" ? farmerPages : disbPages}</span>
          <Button
            disabled={(tab === "farmers" ? page : dPage) >= (tab === "farmers" ? farmerPages : disbPages)}
            onClick={() => (tab === "farmers" ? setPage((p) => p + 1) : setDPage((p) => p + 1))}
            style={{ background: CARD, color: TEXT, border: BORDER, height: 32, fontSize: 12, gap: 4 }}
          >
            Next <ChevronRight size={14} />
          </Button>
        </div>
      )}

      {showForm && (
        <FarmerForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            // Land on page 1 with filters cleared so the new farmer is actually
            // visible — registering someone and not seeing them is confusing.
            setTab("farmers"); setPage(1); setQ(""); setCounty(""); setProjectType("")
            setRefresh((n) => n + 1)
          }}
        />
      )}

      {(detail || detailLoading) && (
        <>
          <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 60 }} />
          <aside style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "min(480px, 100%)", background: CARD,
            borderLeft: BORDER, zIndex: 61, overflowY: "auto", padding: 20,
          }}>
            {detailLoading || !detail ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 60, color: MUTED }}><Loader2 className="animate-spin" /></div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>{detail.fullname}</h2>
                    <div style={{ fontSize: 12, color: MUTED }}>
                      {detail.gender} · {detail.county}{detail.subCounty ? ` / ${detail.subCounty}` : ""}
                    </div>
                  </div>
                  <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED }}>
                    <X size={20} />
                  </button>
                </div>

                <div style={{ display: "grid", gap: 8, marginBottom: 20, fontSize: 13, color: TEXT }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><IdCard size={14} color={MUTED} /> {detail.idNumber}</div>
                  {detail.phoneNumber && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Phone size={14} color={MUTED} /> {detail.phoneNumber}</div>}
                  {detail.email && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Mail size={14} color={MUTED} /> {detail.email}</div>}
                  {detail.group && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Users size={14} color={MUTED} /> {detail.group}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Trees size={14} color={MUTED} /> {detail.projectType} · {detail.landOwnershipType}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><MapIcon size={14} color={MUTED} /> {detail.numberOfAcresCommitted ?? 0} acres committed</div>
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>
                  Disbursements ({detail.disbursements.length})
                </div>
                {detail.disbursements.length === 0 ? (
                  <div style={{ fontSize: 13, color: MUTED, padding: "16px 0" }}>Nothing disbursed to this farmer yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {detail.disbursements.map((d) => (
                      <div key={d.id} style={{ border: BORDER, borderRadius: 10, padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: TEXT }}>{d.itemDisbursed}</div>
                          <div style={{ fontSize: 12, color: MUTED, whiteSpace: "nowrap" }}>{fmtDate(d.disbursementDate)}</div>
                        </div>
                        <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>
                          {d.disbursementCentre} · by {d.disbursedBy}
                        </div>
                        {d.beehives.length > 0 && (
                          <div style={{ fontSize: 12, color: TEXT }}>
                            <strong>{d.beehives.length}</strong> beehive{d.beehives.length === 1 ? "" : "s"}
                            <span style={{ color: MUTED }}>
                              {" — "}
                              {d.beehives
                                .map((b) => `${b.beehive.beehiveId || `#${b.beehive.id}`} (${HIVE_TYPES[b.beehive.beehiveType] ?? b.beehive.beehiveType})`)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                        {d.seedlings.map((s) => (
                          <div key={s.id} style={{ fontSize: 12, color: TEXT }}>
                            <strong>{fmtNum(s.quantity)}</strong> {s.seedling.seedlingSpicies || `seedling #${s.seedling.id}`}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </aside>
        </>
      )}
    </div>
  )
}
