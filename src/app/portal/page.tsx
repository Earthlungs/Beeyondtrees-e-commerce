"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Lock, User, Eye, EyeOff } from "lucide-react"
import { signIn } from "next-auth/react"

const STAFF_CODE = "Earthlungs2026"

export default function PortalPage() {
  const router = useRouter()
  const [step, setStep] = useState<"gate" | "auth">("gate")
  const [mode, setMode] = useState<"login" | "register">("login")
  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  
  const [form, setForm] = useState({ username: "", password: "", name: "" })

  const handleGateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code === STAFF_CODE) {
      setStep("auth")
      setCodeError("")
    } else {
      setCodeError("Invalid access code")
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    const result = await signIn("credentials", {
      username: form.username,
      password: form.password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid credentials")
    } else {
      router.push("/admin")
    }
    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    if (!form.name || !form.username || !form.password) {
      setError("All fields are required")
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/portal-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role: "merchant" }),
    })
    
    const data = await res.json()
    if (data.success) {
      // Auto login after register
      await signIn("credentials", {
        username: form.username,
        password: form.password,
        redirect: false,
      })
      router.push("/admin")
    } else {
      setError(data.error || "Registration failed")
    }
    setLoading(false)
  }

  return (
    <div style={{ backgroundColor: '#F5F1E8', minHeight: '100vh' }}>
      <Header />
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', padding: '24px' }}>
        <Card style={{ width: '420px', maxWidth: '90vw', borderColor: '#A89F91' }}>
          <CardHeader style={{ textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#F5F1E8', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Shield size={28} style={{ color: '#6B7D5C' }} />
            </div>
            <CardTitle style={{ color: '#4A3F2F', fontSize: '20px' }}>
              {step === "gate" ? "Staff Access" : mode === "login" ? "Staff Sign In" : "Create Staff Account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === "gate" ? (
              <form onSubmit={handleGateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ color: '#A89F91', fontSize: '13px', textAlign: 'center' }}>
                  Enter the staff access code to continue
                </p>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A89F91' }} />
                  <Input 
                    type="password" 
                    value={code} 
                    onChange={e => setCode(e.target.value)}
                    placeholder="Enter access code"
                    style={{ paddingLeft: '40px', height: '44px', fontSize: '16px', textAlign: 'center', letterSpacing: '4px' }}
                    autoFocus
                  />
                </div>
                {codeError && (
                  <p style={{ color: '#8C6A4A', fontSize: '12px', textAlign: 'center' }}>{codeError}</p>
                )}
                <Button type="submit" style={{ width: '100%', height: '44px', backgroundColor: '#6B7D5C', color: 'white' }}>
                  Access Portal
                </Button>
              </form>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '18px', backgroundColor: '#F5F1E8', borderRadius: '8px', padding: '3px' }}>
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
                  }}>Create Account</button>
                </div>

                {error && (
                  <div style={{ backgroundColor: '#FFF5F5', color: '#8C6A4A', padding: '10px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px', textAlign: 'center' }}>{error}</div>
                )}

                <form onSubmit={mode === "login" ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {mode === "register" && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: '#4A3F2F' }}>Full Name</label>
                      <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="John Doe" style={{ height: '40px' }} />
                    </div>
                  )}
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: '#4A3F2F' }}>Username</label>
                    <Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="Enter username" style={{ height: '40px' }} required />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: '#4A3F2F' }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <Input type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Enter password" style={{ height: '40px' }} required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#A89F91' }}>
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} style={{ width: '100%', height: '42px', backgroundColor: mode === "login" ? '#6B7D5C' : '#8C6A4A', color: 'white', fontSize: '14px', marginTop: '4px' }}>
                    {loading ? 'Please wait...' : mode === "login" ? 'Sign In' : 'Create Account'}
                  </Button>

                  <button type="button" onClick={() => setStep("gate")} style={{ background: 'none', border: 'none', color: '#A89F91', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
                    Back
                  </button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
