import Link from "next/link"

const GREEN = "#6B7D5C"

// Shown on a public document page when the signed link is missing/invalid or the
// document doesn't exist. Deliberately vague so it can't be used to probe ids.
export default function InvalidLink({ message }: { message?: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#ECE6DC", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "white", borderRadius: 14, padding: "40px 32px", maxWidth: 440, textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.10)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="Beeyond Trees" width={48} height={48} style={{ objectFit: "contain", marginBottom: 14 }} />
        <h1 style={{ fontSize: 19, fontWeight: 800, color: "#1a1a1a", marginBottom: 8 }}>Link unavailable</h1>
        <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, marginBottom: 20 }}>
          {message || "This document link is invalid or has expired. Please ask Beeyond Trees to resend it."}
        </p>
        <Link href="https://www.beeyondtrees.org" style={{ color: GREEN, fontWeight: 600, textDecoration: "none", fontSize: 14 }}>
          Visit beeyondtrees.org →
        </Link>
      </div>
    </div>
  )
}
