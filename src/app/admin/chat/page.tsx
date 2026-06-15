"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquare, Send, Loader2, ArrowLeft, Check, CheckCheck, Megaphone, X } from "lucide-react"
import { ROLE_LABELS } from "@/lib/tracing-stages"

const TEXT = "var(--admin-text)"
const MUTED = "var(--admin-muted)"
const GREEN = "#6B7D5C"
const BLUE = "#2F80ED"

interface Contact { id: string; name: string; role: string; image: string | null; unread: number }
interface Msg { id: string; fromUserId: string; toUserId: string; body: string; readAt: string | null; createdAt: string }

// Single-column on phones, two-pane on desktop.
function useIsMobile() {
  const [m, setM] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const on = () => setM(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return m
}

export default function ChatPage() {
  const isMobile = useIsMobile()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role
  const isAdmin = role === "admin" || role === "it_specialist"

  const [contacts, setContacts] = useState<Contact[]>([])
  const [active, setActive] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const restoredRef = useRef(false) // restore last thread once, not on every poll

  // Broadcast (bulk message to many users) — admin / IT only.
  const [bcOpen, setBcOpen] = useState(false)
  const [bcSel, setBcSel] = useState<Set<string>>(new Set())
  const [bcText, setBcText] = useState("")
  const [bcSending, setBcSending] = useState(false)
  const [bcNote, setBcNote] = useState("")

  const sendBroadcast = async () => {
    const toUserIds = bcSel.size === contacts.length ? "all" : [...bcSel]
    if (!bcText.trim() || (toUserIds !== "all" && toUserIds.length === 0)) { setBcNote("Pick recipients and write a message."); return }
    setBcSending(true); setBcNote("")
    try {
      const res = await fetch("/api/chat/broadcast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toUserIds, body: bcText }) })
      const out = await res.json()
      if (!res.ok) { setBcNote(out.error || "Could not send."); return }
      setBcNote(`Sent to ${out.sent} ${out.sent === 1 ? "person" : "people"}.`)
      setBcText(""); setBcSel(new Set())
      setTimeout(() => { setBcOpen(false); setBcNote("") }, 1200)
    } catch { setBcNote("Network error.") }
    finally { setBcSending(false) }
  }

  const loadContacts = useCallback(async () => {
    const res = await fetch("/api/chat")
    if (res.ok) setContacts((await res.json()).contacts)
    setLoading(false)
  }, [])

  const loadThread = useCallback(async (id: string) => {
    const res = await fetch(`/api/chat?with=${id}`)
    if (res.ok) setMessages((await res.json()).messages)
  }, [])

  useEffect(() => { loadContacts(); const t = setInterval(loadContacts, 6000); return () => clearInterval(t) }, [loadContacts])

  // Re-open the last conversation after a reload/re-login so history is visible
  // immediately (it's stored server-side; we just remember which thread was open).
  useEffect(() => {
    if (restoredRef.current || active || contacts.length === 0) return
    restoredRef.current = true // only ever restore once (first load), never on a poll
    const last = typeof window !== "undefined" ? localStorage.getItem("chat-active") : null
    const c = last && contacts.find((x) => x.id === last)
    if (c) open(c)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts])

  useEffect(() => {
    if (!active) return
    loadThread(active.id)
    const t = setInterval(() => loadThread(active.id), 4000)
    return () => clearInterval(t)
  }, [active, loadThread])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const open = (c: Contact) => {
    setActive(c)
    setMessages([])
    if (typeof window !== "undefined") localStorage.setItem("chat-active", c.id)
    setContacts((prev) => prev.map((x) => (x.id === c.id ? { ...x, unread: 0 } : x)))
  }

  const send = async () => {
    if (!active || !text.trim()) return
    setSending(true)
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toUserId: active.id, body: text }) })
      if (res.ok) { setText(""); await loadThread(active.id) }
    } finally { setSending(false) }
  }

  const showContacts = !isMobile || !active
  const showConvo = !isMobile || !!active

  const Avatar = ({ c, size = 36 }: { c: Contact; size?: number }) => c.image
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={c.image} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: "50%", background: GREEN, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>{c.name.charAt(0).toUpperCase()}</div>

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <MessageSquare size={22} color={GREEN} />
        <h1 style={{ fontSize: 22, fontWeight: "bold", color: TEXT }}>Chat</h1>
        {isAdmin && (
          <Button onClick={() => { setBcOpen(true); setBcSel(new Set()); setBcText(""); setBcNote("") }} style={{ marginLeft: "auto", background: "#8C6A4A", color: "white", gap: 6, height: 38 }}>
            <Megaphone size={16} /> Broadcast
          </Button>
        )}
      </div>

      {/* Broadcast composer — send one message to many at once */}
      {bcOpen && (
        <div onClick={() => !bcSending && setBcOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--admin-card)", borderRadius: 14, padding: 20, width: "100%", maxWidth: 460, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <Megaphone size={18} color="#8C6A4A" />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginLeft: 8 }}>Broadcast Message</h2>
              <button onClick={() => setBcOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: MUTED, display: "flex" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: MUTED }}>Recipients ({bcSel.size}/{contacts.length})</span>
              <button onClick={() => setBcSel(bcSel.size === contacts.length ? new Set() : new Set(contacts.map((c) => c.id)))}
                style={{ background: "none", border: "none", color: GREEN, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {bcSel.size === contacts.length ? "Clear all" : "Select all"}
              </button>
            </div>
            <div style={{ border: "1px solid var(--admin-border)", borderRadius: 8, overflowY: "auto", maxHeight: 220, marginBottom: 12 }}>
              {contacts.map((c) => {
                const on = bcSel.has(c.id)
                return (
                  <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid var(--admin-border)", cursor: "pointer", background: on ? "var(--admin-card-2)" : "var(--admin-card)" }}>
                    <input type="checkbox" checked={on} onChange={() => { const n = new Set(bcSel); on ? n.delete(c.id) : n.add(c.id); setBcSel(n) }} />
                    <Avatar c={c} size={28} />
                    <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: MUTED }}>{ROLE_LABELS[c.role] ?? c.role}</span>
                  </label>
                )
              })}
            </div>
            <textarea value={bcText} onChange={(e) => setBcText(e.target.value)} placeholder="Type your announcement…"
              style={{ width: "100%", minHeight: 80, border: "1px solid var(--admin-border)", borderRadius: 8, padding: 10, color: TEXT, fontSize: 14, resize: "vertical" }} />
            {bcNote && <div style={{ fontSize: 12, color: bcNote.startsWith("Sent") ? GREEN : "#C0392B", marginTop: 6 }}>{bcNote}</div>}
            <Button onClick={sendBroadcast} disabled={bcSending} style={{ background: "#8C6A4A", color: "white", marginTop: 12, gap: 6, height: 42 }}>
              {bcSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send to {bcSel.size === contacts.length && contacts.length > 0 ? "everyone" : `${bcSel.size} selected`}
            </Button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 16, height: "calc(100vh - 160px)", minHeight: 360 }}>
        {/* Contacts */}
        {showContacts && (
          <div style={{ width: isMobile ? "100%" : 280, background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, overflowY: "auto", flexShrink: 0 }}>
            {loading ? (
              <div style={{ padding: 20, color: MUTED, display: "flex", justifyContent: "center" }}><Loader2 className="animate-spin" /></div>
            ) : contacts.length === 0 ? (
              <div style={{ padding: 20, color: MUTED, fontSize: 13 }}>No other staff yet.</div>
            ) : contacts.map((c) => (
              <button key={c.id} onClick={() => open(c)} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                padding: "12px 14px", border: "none", borderBottom: "1px solid var(--admin-border)", cursor: "pointer",
                background: active?.id === c.id ? "var(--admin-card-2)" : "var(--admin-card)",
              }}>
                <Avatar c={c} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{ROLE_LABELS[c.role] ?? c.role}</div>
                </div>
                {c.unread > 0 && <span style={{ background: "#C0392B", color: "white", fontSize: 11, fontWeight: 700, borderRadius: 999, minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>{c.unread}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Conversation */}
        {showConvo && (
          <div style={{ flex: 1, background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {!active ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 14, padding: 20, textAlign: "center" }}>Select someone to start chatting.</div>
            ) : (
              <>
                <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--admin-border)", display: "flex", alignItems: "center", gap: 10 }}>
                  {isMobile && (
                    <button onClick={() => setActive(null)} aria-label="Back" style={{ background: "none", border: "none", cursor: "pointer", color: TEXT, padding: 2, display: "flex" }}>
                      <ArrowLeft size={20} />
                    </button>
                  )}
                  <Avatar c={active} size={32} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>{active.name}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>{ROLE_LABELS[active.role] ?? active.role}</div>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8, background: "var(--admin-card-2)" }}>
                  {messages.map((m) => {
                    const mine = m.fromUserId !== active.id
                    return (
                      <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                        <div style={{ background: mine ? GREEN : "var(--admin-card-2)", color: mine ? "white" : TEXT, border: mine ? "none" : "1px solid var(--admin-border)", padding: "8px 12px", borderRadius: 14, fontSize: 14, lineHeight: 1.4, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>
                        <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: mine ? "flex-end" : "flex-start", marginTop: 2 }}>
                          <span style={{ fontSize: 10, color: MUTED }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          {mine && (m.readAt
                            ? <CheckCheck size={14} color={BLUE} aria-label="Read" />
                            : <Check size={14} color={MUTED} aria-label="Sent" />)}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={endRef} />
                </div>

                <div style={{ padding: 10, borderTop: "1px solid var(--admin-border)", display: "flex", gap: 8 }}>
                  <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                    placeholder="Type a message…" style={{ flex: 1, height: 42, borderRadius: 21, border: "1px solid var(--admin-border)", padding: "0 16px", color: TEXT, fontSize: 14 }} />
                  <Button onClick={send} disabled={sending || !text.trim()} style={{ background: GREEN, color: "white", height: 42, width: 42, borderRadius: 21, padding: 0, flexShrink: 0 }}>
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
