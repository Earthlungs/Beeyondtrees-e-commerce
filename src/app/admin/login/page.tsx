"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, User, Shield, Store } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<"admin" | "merchant">("admin")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid credentials. Please try again.")
      setLoading(false)
    } else {
      router.push("/admin")
      router.refresh()
    }
  }

  const quickLogin = (role: "admin" | "merchant") => {
    setSelectedRole(role)
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #6B7D5C 0%, #4A5A3F 50%, #2D3626 100%)',
      padding: '20px'
    }}>
      <Card style={{
        width: '440px', 
        maxWidth: '90vw',
        backgroundColor: 'white', 
        border: 'none',
        boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
        borderRadius: '16px',
        marginTop: '40px'
      }}>
        <CardHeader style={{ textAlign: 'center', paddingBottom: '8px' }}>
          <div style={{ 
            width: '56px', height: '56px', 
            backgroundColor: '#F5F1E8', 
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            {selectedRole === "admin" ? (
              <Shield size={28} style={{ color: '#6B7D5C' }} />
            ) : (
              <Store size={28} style={{ color: '#8C6A4A' }} />
            )}
          </div>
          <CardTitle style={{ fontSize: '22px', color: '#4A3F2F' }}>
            {selectedRole === "admin" ? 'Administrator Login' : 'Merchant Login'}
          </CardTitle>
          <p style={{ color: '#A89F91', fontSize: '14px', marginTop: '4px' }}>
            Sign in to manage {selectedRole === "admin" ? 'the entire platform' : 'your products and orders'}
          </p>
        </CardHeader>
        <CardContent>
          {/* Role Toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', backgroundColor: '#F5F1E8', borderRadius: '10px', padding: '4px' }}>
            <button
              onClick={() => quickLogin("admin")}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                backgroundColor: selectedRole === "admin" ? '#6B7D5C' : 'transparent',
                color: selectedRole === "admin" ? 'white' : '#A89F91',
                cursor: 'pointer', fontWeight: '500', fontSize: '14px',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Shield size={16} /> Administrator
            </button>
            <button
              onClick={() => quickLogin("merchant")}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                backgroundColor: selectedRole === "merchant" ? '#8C6A4A' : 'transparent',
                color: selectedRole === "merchant" ? 'white' : '#A89F91',
                cursor: 'pointer', fontWeight: '500', fontSize: '14px',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Store size={16} /> Merchant
            </button>
          </div>

          {error && (
            <div style={{ 
              backgroundColor: '#FFF5F5', color: '#8C6A4A', padding: '12px', 
              borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' 
            }}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#4A3F2F' }}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A89F91' }} />
                <Input value={username} onChange={e => setUsername(e.target.value)}
                  placeholder={selectedRole === "admin" ? "admin" : "merchant"}
                  style={{ paddingLeft: '40px', height: '44px' }} required />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#4A3F2F' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A89F91' }} />
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{ paddingLeft: '40px', height: '44px' }} required />
              </div>
            </div>
            <Button type="submit" disabled={loading}
              style={{ 
                width: '100%', height: '44px', 
                backgroundColor: selectedRole === "admin" ? '#6B7D5C' : '#8C6A4A', 
                color: 'white', fontSize: '15px', fontWeight: '500', marginTop: '8px' 
              }}>
              {loading ? 'Signing in...' : `Sign In as ${selectedRole === "admin" ? 'Administrator' : 'Merchant'}`}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  )
}
