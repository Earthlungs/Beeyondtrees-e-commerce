"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"

const GREEN = "#6B7D5C"
const RED = "#C0392B"

interface ConfirmModalProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

interface PromptModalProps {
  open: boolean
  title: string
  message?: string
  placeholder?: string
  confirmLabel?: string
  cancelLabel?: string
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}

const backdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9000,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
}
const panel: React.CSSProperties = {
  background: "white", borderRadius: 14, padding: "28px 28px 22px",
  maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  position: "relative",
}

export function ConfirmModal({ open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger, onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null
  return (
    <div style={backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={panel} role="dialog" aria-modal="true">
        <button onClick={onCancel} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "#888" }}>
          <X size={18} />
        </button>
        <div style={{ fontWeight: 800, fontSize: 17, color: "#1a1a1a", marginBottom: message ? 10 : 22 }}>{title}</div>
        {message && <p style={{ fontSize: 14, color: "#555", marginBottom: 22, lineHeight: 1.6 }}>{message}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #ddd", background: "white", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: danger ? RED : GREEN, color: "white", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PromptModal({ open, title, message, placeholder, confirmLabel = "Confirm", cancelLabel = "Cancel", value, onChange, onConfirm, onCancel }: PromptModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50) }, [open])
  if (!open) return null
  return (
    <div style={backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={panel} role="dialog" aria-modal="true">
        <button onClick={onCancel} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "#888" }}>
          <X size={18} />
        </button>
        <div style={{ fontWeight: 800, fontSize: 17, color: "#1a1a1a", marginBottom: message ? 10 : 16 }}>{title}</div>
        {message && <p style={{ fontSize: 14, color: "#555", marginBottom: 14, lineHeight: 1.6 }}>{message}</p>}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) onConfirm(); if (e.key === "Escape") onCancel() }}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", fontSize: 14, marginBottom: 20, boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #ddd", background: "white", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={!value.trim()} style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: value.trim() ? RED : "#ccc", color: "white", cursor: value.trim() ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
