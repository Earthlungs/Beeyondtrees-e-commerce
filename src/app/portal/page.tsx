"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Leaf, Lock, User, Mail, Phone, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export default function PortalPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  
  const [form, setForm] = useState({
    username: "", password: "", name: "", email: "", phone: ""
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    const res = await fetch('/api/auth/portal-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.username, password: form.password }),
    })
    
    const data = await res.json()
    if (data.success) {
      if (data.user.role === 'admin' || data.user.role === 'merchant') {
        router.push('/admin')
      } else {
        router.push('/products')
      }
    } else {
      setError(data.error || "Invalid credentials")
    }
    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    if (!form.name || !form.username || !form.password) {
      setError("Name, username and password are required")
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/portal-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    
    const data = await res.json()
    if (data.success) {
      setError("")
      alert("Account created! You can now sign in.")
      setMode("login")
    } else {
      setError(data.error || "Registration failed")
    }
    setLoading(false)
  }

  return (
    <div style={{ backgroundColor: '#F5F1E8', minHeight: '100vh' }}>
      <Header />
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', padding: '24px' }}>
        <Card style={{ width: '440px', maxWidth: '90vw', borderColor: '#A89F91' }}>
          <CardHeader style={{ textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#F5F1E8', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Lock size={24} style={{ color: '#6B7D5C' }} />
            </div>
            <CardTitle style={{ color: '#4A3F2F', fontSize: '20px' }}>
              {mode === "login" ? "Portal Access" : "Create Account"}
            </CardTitle>
            <p style={{ color: '#A89F91', fontSize: '13px', marginTop: '4px' }}>
              {mode === "login" ? "Sign in to access your portal" : "Register for a new account"}
            </p>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', backgroundColor: '#F5F1E8', borderRadius: '8px', padding: '3px' }}>
              <button onClick={() => setMode("login")} style={{
                flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
                backgroundColor: mode === "login" ? '#6B7D5C' : 'transparent',
                color: mode === "login" ? 'white' : '#A89F91',
                cursor: 'pointer', fontWeight: '500', fontSize: '13px',
              }}>Sign In</button>
              <button onClick={() => setMode("register")} style={{
                flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
                backgroundColor: mode === "register" ? '#8C6A4A' : 'transparent',
                color: mode === "register" ? 'white' : '#A89F91',
                cursor: 'pointer', fontWeight: '500', fontSize: '13px',
              }}>Sign Up</button>
            </div>

            {error && (
              <div style={{ backgroundColor: '#FFF5F5', color: '#8C6A4A', padding: '10px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px', textAlign: 'center' }}>{error}</div>
            )}

            <form onSubmit={mode === "login" ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mode === "register" && (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: '#4A3F2F' }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#A89F91' }} />
                    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="John Doe" style={{ paddingLeft: '34px', height: '40px' }} />
                  </div>
                </div>
              )}
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: '#4A3F2F' }}>Username</label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#A89F91' }} />
                  <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="Enter username" style={{ paddingLeft: '34px', height: '40px' }} required />
                </div>
              </div>

              {mode === "register" && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: '#4A3F2F' }}>Email</label>
                    <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} type="email" placeholder="john@example.com" style={{ height: '40px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: '#4A3F2F' }}>Phone</label>
                    <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="0712 345 678" style={{ height: '40px' }} />
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: '#4A3F2F' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#A89F91' }} />
                  <Input type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Enter password" style={{ paddingLeft: '34px', height: '40px' }} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#A89F91' }}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading} style={{ width: '100%', height: '42px', backgroundColor: mode === "login" ? '#6B7D5C' : '#8C6A4A', color: 'white', fontSize: '14px', marginTop: '4px' }}>
                {loading ? 'Please wait...' : mode === "login" ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
