"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"

const SAGE = "#6B7D5C"
const DARK = "#4A3F2F"
const MUTED = "#A89F91"

type State = "verifying" | "success" | "failed"

function VerifyContent() {
  const params = useSearchParams()
  const orderId = params.get("orderId")
  const reference = params.get("reference") || params.get("trxref")
  const [state, setState] = useState<State>("verifying")

  useEffect(() => {
    if (!orderId || !reference) {
      setState("failed")
      return
    }
    let cancelled = false
    fetch(`/api/orders/${orderId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
      .then((r) => r.json())
      .then((result) => {
        if (cancelled) return
        setState(result?.verified ? "success" : "failed")
      })
      .catch(() => { if (!cancelled) setState("failed") })
    return () => { cancelled = true }
  }, [orderId, reference])

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: 16, textAlign: "center" }}>
      {state === "verifying" && (
        <>
          <Loader2 size={44} style={{ color: SAGE, marginBottom: 18 }} className="animate-spin" />
          <h2 style={{ color: DARK, fontSize: 22, marginBottom: 6 }}>Confirming your payment…</h2>
          <p style={{ color: MUTED, fontSize: 14 }}>Please wait, this only takes a moment.</p>
        </>
      )}

      {state === "success" && (
        <>
          <div style={{ backgroundColor: SAGE, borderRadius: "50%", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <CheckCircle size={48} style={{ color: "white" }} />
          </div>
          <h2 style={{ color: DARK, marginBottom: 8, fontSize: 24 }}>Payment Successful!</h2>
          {reference && <p style={{ color: MUTED, marginBottom: 4, fontSize: 14 }}>Reference: <strong style={{ color: DARK }}>{reference}</strong></p>}
          <p style={{ color: MUTED, marginBottom: 24, fontSize: 14 }}>We&apos;ll contact you shortly to arrange delivery.</p>
          <Link href="/products">
            <Button variant="outline" style={{ borderColor: SAGE, color: SAGE }}>Continue Shopping</Button>
          </Link>
        </>
      )}

      {state === "failed" && (
        <>
          <div style={{ backgroundColor: "#C0392B", borderRadius: "50%", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <XCircle size={48} style={{ color: "white" }} />
          </div>
          <h2 style={{ color: DARK, marginBottom: 8, fontSize: 24 }}>Payment not confirmed</h2>
          <p style={{ color: MUTED, marginBottom: 4, fontSize: 14, maxWidth: 420 }}>
            We couldn&apos;t confirm your payment. If you were charged, please contact support
            {reference ? <> with reference <strong style={{ color: DARK }}>{reference}</strong></> : null}.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <Link href="/checkout"><Button style={{ backgroundColor: SAGE, color: "white" }}>Try again</Button></Link>
            <Link href="/products"><Button variant="outline" style={{ borderColor: MUTED, color: MUTED }}>Back to shop</Button></Link>
          </div>
        </>
      )}
    </div>
  )
}

export default function VerifyPage() {
  return (
    <div style={{ backgroundColor: "#F5F1E8", minHeight: "100vh" }}>
      <Header />
      <Suspense fallback={<div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", color: MUTED }}>Loading…</div>}>
        <VerifyContent />
      </Suspense>
    </div>
  )
}
