import Link from "next/link"
import { MapPin, Phone, Mail } from "lucide-react"

export function Footer() {
  return (
    <footer style={{ backgroundColor: "#3D3226", color: "#E8E1D4", padding: "60px 20px 28px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 36, marginBottom: 44 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
              <img src="/icons/icon-192.png" alt="" width={34} height={34} style={{ objectFit: "contain" }} />
              <span className="font-display" style={{ fontSize: 21, fontWeight: 600, color: "white" }}>BEEyond Trees</span>
            </div>
            <p style={{ fontSize: 14, color: "#B8A99A", lineHeight: 1.7, maxWidth: 260 }}>Sustainable natural products from Kenya, sustaining forest-adjacent communities beyond tree planting.</p>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: 14, color: "white", fontSize: 14, letterSpacing: "0.05em" }}>Explore</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 14 }}>
              {[["Home", "/"], ["Shop", "/products"], ["New Arrivals", "/new-arrivals"], ["Wishlist", "/wishlist"]].map(([l, h]) => (
                <Link key={h} href={h} style={{ color: "#B8A99A", textDecoration: "none" }}>{l}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: 14, color: "white", fontSize: 14, letterSpacing: "0.05em" }}>Company</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 14 }}>
              {[["Where We Work", "/where-we-work"], ["Our Stories", "/our-stories"], ["Contact", "/contact"], ["Staff Portal", "/portal"]].map(([l, h]) => (
                <Link key={h} href={h} style={{ color: "#B8A99A", textDecoration: "none" }}>{l}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: 14, color: "white", fontSize: 14, letterSpacing: "0.05em" }}>Reach us</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, fontSize: 14, color: "#B8A99A" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><MapPin size={15} /> Nairobi, Kenya</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Phone size={15} /> +254 718 681 684</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Mail size={15} /> beeyondtrees@earthlungs.org</span>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 22, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, fontSize: 13, color: "#9a8d7d" }}>
          <span>© {new Date().getFullYear()} BEEyond Trees. All rights reserved.</span>
          <span>Powered by EarthLungs Reforestation Foundation</span>
        </div>
      </div>
    </footer>
  )
}
