"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CalendarDays, Plus, X, Loader2, Check, Ban, Users, AlertTriangle } from "lucide-react"
import { ConfirmModal, PromptModal, SuccessModal } from "@/components/admin/ConfirmModal"
import { LEAVE_TYPES, LEAVE_STATUS_LABELS, leaveTypeLabel, countLeaveDays, parseDayInput } from "@/lib/attendance"
import { ROLE_LABELS, isAdminishRole } from "@/lib/tracing-stages"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const RED = "#C0392B"

interface Leave {
  id: string
  reference: string
  userId: string
  userName: string
  userEmail: string | null
  role: string
  type: string
  startDate: string
  endDate: string
  days: number
  reason: string
  handoverTo: string | null
  contact: string | null
  status: string
  decidedBy: string | null
  decidedAt: string | null
  decisionNote: string | null
  createdAt: string
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })

const STATUS_COLOUR: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#FFF6E0", fg: "#8A6400" },
  approved: { bg: "#E7F4EC", fg: "#136B36" },
  rejected: { bg: "#FBEAEA", fg: "#9B2C2C" },
  cancelled: { bg: "var(--admin-card-2)", fg: "#777" },
}

export default function LeavesPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role || ""
  const isAdmin = isAdminishRole(role)
  // Approval authority sits with the CEO alone (role "admin"). Assistant CEO and
  // IT can watch the queue but the API rejects their decisions.
  const canDecide = role === "admin"

  const [tab, setTab] = useState<"me" | "all">("me")
  const [mine, setMine] = useState<Leave[]>([])
  const [all, setAll] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)
  const [allLoading, setAllLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [type, setType] = useState("annual")
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [reason, setReason] = useState("")
  const [handoverTo, setHandoverTo] = useState("")
  const [contact, setContact] = useState("")

  const [rejecting, setRejecting] = useState<Leave | null>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [approving, setApproving] = useState<Leave | null>(null)
  const [cancelling, setCancelling] = useState<Leave | null>(null)
  const [acting, setActing] = useState(false)

  const loadMine = useCallback(async () => {
    try {
      const res = await fetch("/api/leaves")
      if (res.ok) setMine((await res.json()).leaves ?? [])
    } finally { setLoading(false) }
  }, [])

  const loadAll = useCallback(async () => {
    setAllLoading(true)
    try {
      const res = await fetch("/api/leaves?scope=all")
      if (res.ok) setAll((await res.json()).leaves ?? [])
    } finally { setAllLoading(false) }
  }, [])

  useEffect(() => { loadMine() }, [loadMine])

  // Fetched on the tab click rather than in an effect — the switch is a user
  // event, so there is nothing to synchronise on render.
  const openAllTab = () => { setTab("all"); loadAll() }

  const sd = parseDayInput(startDate)
  const ed = parseDayInput(endDate)
  const previewDays = sd && ed && ed >= sd ? countLeaveDays(sd, ed) : 0

  const resetForm = () => {
    setType("annual"); setStartDate(today); setEndDate(today)
    setReason(""); setHandoverTo(""); setContact("")
  }

  const apply = async () => {
    setError("")
    if (!reason.trim()) { setError("Give a reason for your leave."); return }
    if (!previewDays) { setError("Check your dates — the end date must be on or after the start date."); return }
    setSaving(true)
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, startDate, endDate, reason, handoverTo, contact }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not submit your request."); return }
      setSuccess(data.reference)
      resetForm(); setShowForm(false)
      loadMine()
    } catch { setError("Network error. Try again.") }
    finally { setSaving(false) }
  }

  const decide = async (leave: Leave, action: "approve" | "reject" | "cancel", note?: string) => {
    setActing(true)
    try {
      const res = await fetch(`/api/leaves/${leave.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not update this request."); return }
      loadMine()
      if (isAdmin) loadAll()
    } catch { setError("Network error. Try again.") }
    finally {
      setActing(false)
      setApproving(null); setRejecting(null); setCancelling(null); setRejectNote("")
    }
  }

  const pendingCount = all.filter((l) => l.status === "pending").length

  return (
    <div>
      <SuccessModal
        open={!!success}
        title={`Leave request ${success ?? ""} submitted`}
        message="The CEO has been emailed and will review it. You will get an email as soon as a decision is made."
        onClose={() => setSuccess(null)}
      />
      <ConfirmModal
        open={!!approving}
        title={`Approve ${approving?.reference ?? ""}?`}
        message={approving ? `${approving.userName} will be on ${leaveTypeLabel(approving.type).toLowerCase()} for ${approving.days} day${approving.days === 1 ? "" : "s"} (${day(approving.startDate)} – ${day(approving.endDate)}). They will be emailed the approval.` : ""}
        confirmLabel={acting ? "Approving…" : "Approve"}
        onConfirm={() => approving && decide(approving, "approve")}
        onCancel={() => setApproving(null)}
      />
      <PromptModal
        open={!!rejecting}
        title={`Reject ${rejecting?.reference ?? ""}?`}
        message="Give a reason — it is included in the email sent to the applicant."
        placeholder="Reason for rejecting"
        value={rejectNote}
        onChange={setRejectNote}
        confirmLabel={acting ? "Rejecting…" : "Reject"}
        onConfirm={() => rejecting && rejectNote.trim() && decide(rejecting, "reject", rejectNote.trim())}
        onCancel={() => { setRejecting(null); setRejectNote("") }}
      />
      <ConfirmModal
        open={!!cancelling}
        title={`Withdraw ${cancelling?.reference ?? ""}?`}
        message="This withdraws your pending request. You can apply again afterwards."
        confirmLabel={acting ? "Withdrawing…" : "Withdraw"}
        danger
        onConfirm={() => cancelling && decide(cancelling, "cancel")}
        onCancel={() => setCancelling(null)}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CalendarDays size={22} color={GREEN} />
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Leave</h1>
        </div>
        <Button onClick={() => { setShowForm((s) => !s); setError("") }} style={{ background: GREEN, color: "white", gap: 6 }}>
          {showForm ? <><X size={16} /> Close</> : <><Plus size={16} /> Apply for Leave</>}
        </Button>
      </div>

      {error && !showForm && (
        <div style={{ background: "#FBEAEA", color: "#9B2C2C", padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14, display: "flex", gap: 8 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {showForm && (
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          {error && <div style={{ background: "#FBEAEA", color: "#9B2C2C", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <p style={{ color: MUTED, fontSize: 13, margin: "0 0 16px" }}>
            Your request goes straight to the CEO for approval. You will be emailed the decision.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
            <Field label="Leave type">
              <select value={type} onChange={(e) => setType(e.target.value)}
                style={{ width: "100%", height: 36, padding: "0 10px", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 13.5, background: "white" }}>
                {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="First day"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
            <Field label="Last day"><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
            <Field label="Duration">
              <div style={{ height: 36, display: "flex", alignItems: "center", fontSize: 13.5, fontWeight: 600, color: previewDays ? GREEN : RED }}>
                {previewDays ? `${previewDays} day${previewDays === 1 ? "" : "s"}` : "Check your dates"}
              </div>
            </Field>
            <Field label="Handover to (optional)"><Input value={handoverTo} onChange={(e) => setHandoverTo(e.target.value)} placeholder="Colleague covering for you" /></Field>
            <Field label="Reachable on (optional)"><Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone or email while away" /></Field>
          </div>
          <Field label="Reason *">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why you need this leave"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 13.5, fontFamily: "inherit", resize: "vertical" }}
            />
          </Field>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={apply} disabled={saving} style={{ background: GREEN, color: "white", gap: 8, height: 42 }}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <>Submit to CEO</>}
            </Button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <TabButton active={tab === "me"} onClick={() => setTab("me")} icon={<CalendarDays size={15} />} label="My requests" />
          <TabButton active={tab === "all"} onClick={openAllTab} icon={<Users size={15} />} label={`All requests${pendingCount ? ` (${pendingCount})` : ""}`} />
        </div>
      )}

      <LeaveTable
        rows={tab === "all" ? all : mine}
        loading={tab === "all" ? allLoading : loading}
        showStaff={tab === "all"}
        empty={tab === "all" ? "No leave requests yet." : "You have not applied for any leave yet."}
        canDecide={canDecide}
        meIsAdmin={isAdmin}
        acting={acting}
        onApprove={setApproving}
        onReject={(l) => { setRejecting(l); setRejectNote("") }}
        onCancel={setCancelling}
      />

      {isAdmin && !canDecide && tab === "all" && (
        <p style={{ color: MUTED, fontSize: 12.5, marginTop: 12 }}>
          You can review the queue, but only the CEO can approve or reject a leave request.
        </p>
      )}
    </div>
  )
}

function LeaveTable({
  rows, loading, showStaff, empty, canDecide, meIsAdmin, acting,
  onApprove, onReject, onCancel,
}: {
  rows: Leave[]; loading: boolean; showStaff: boolean; empty: string
  canDecide: boolean; meIsAdmin: boolean; acting: boolean
  onApprove: (l: Leave) => void; onReject: (l: Leave) => void; onCancel: (l: Leave) => void
}) {
  return (
    <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, overflow: "hidden" }}>
      {loading ? (
        <p style={{ padding: 24, color: MUTED }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ padding: 24, color: MUTED, textAlign: "center" }}>{empty}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr style={{ background: "var(--admin-card-2)", fontSize: 12, color: MUTED, textAlign: "left" }}>
                <th style={th}>Ref</th>
                {showStaff && <th style={th}>Staff</th>}
                <th style={th}>Type</th>
                <th style={th}>Dates</th>
                <th style={th}>Days</th>
                <th style={th}>Status</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const c = STATUS_COLOUR[l.status] ?? STATUS_COLOUR.cancelled
                return (
                  <tr key={l.id} style={{ borderTop: "1px solid var(--admin-border)", verticalAlign: "top" }}>
                    <td style={{ ...td, fontWeight: 600, whiteSpace: "nowrap" }}>{l.reference}</td>
                    {showStaff && (
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{l.userName}</div>
                        <div style={{ color: MUTED, fontSize: 12 }}>{ROLE_LABELS[l.role] ?? l.role}</div>
                      </td>
                    )}
                    <td style={td}>{leaveTypeLabel(l.type)}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {day(l.startDate)}<br />
                      <span style={{ color: MUTED, fontSize: 12 }}>to {day(l.endDate)}</span>
                    </td>
                    <td style={td}>{l.days}</td>
                    <td style={td}>
                      <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: c.bg, color: c.fg }}>
                        {LEAVE_STATUS_LABELS[l.status] ?? l.status}
                      </span>
                      {l.decidedBy && l.status !== "pending" && (
                        <div style={{ color: MUTED, fontSize: 11.5, marginTop: 4 }}>
                          by {l.decidedBy}{l.decidedAt ? ` · ${day(l.decidedAt)}` : ""}
                        </div>
                      )}
                      {l.decisionNote && (
                        <div style={{ color: MUTED, fontSize: 12, marginTop: 4, maxWidth: 240 }}>“{l.decisionNote}”</div>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      {l.status === "pending" && canDecide && showStaff && (
                        <span style={{ display: "inline-flex", gap: 6 }}>
                          <Button onClick={() => onApprove(l)} disabled={acting} style={{ background: GREEN, color: "white", height: 32, padding: "0 12px", fontSize: 12.5, gap: 5 }}>
                            <Check size={14} /> Approve
                          </Button>
                          <Button onClick={() => onReject(l)} disabled={acting} style={{ background: RED, color: "white", height: 32, padding: "0 12px", fontSize: 12.5, gap: 5 }}>
                            <Ban size={14} /> Reject
                          </Button>
                        </span>
                      )}
                      {l.status === "pending" && !showStaff && (
                        <Button onClick={() => onCancel(l)} disabled={acting} style={{ background: "var(--admin-card-2)", color: TEXT, height: 32, padding: "0 12px", fontSize: 12.5 }}>
                          Withdraw
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div style={{ borderTop: "1px solid var(--admin-border)", padding: "10px 14px", fontSize: 12, color: MUTED }}>
          {meIsAdmin && showStaff
            ? "Approving or rejecting emails the applicant automatically."
            : "You will be emailed as soon as the CEO decides."}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: TEXT, marginBottom: 4, display: "block" }}>{label}</span>
      {children}
    </label>
  )
}

const th: React.CSSProperties = { padding: "10px 14px", fontWeight: 600 }
const td: React.CSSProperties = { padding: "10px 14px", fontSize: 13.5, color: TEXT }
