"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Leaf, Lock, User } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

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
      setError("Invalid credentials")
      setLoading(false)
    } else {
      router.push("/admin")
      router.refresh()
    }
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
      <div style={{ position: 'absolute', top: '40px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
          <Leaf size={32} />
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Beeyond Trees</h1>
        </div>
        <p style={{ color: '#E6D3A3', fontSize: '14px' }}>Admin Dashboard</p>
      </div>

      <Card style={{ 
        width: '400px', 
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
            <Lock size={24} style={{ color: '#6B7D5C' }} />
          </div>
          <CardTitle style={{ fontSize: '22px', color: '#4A3F2F' }}>Welcome Back</CardTitle>
          <p style={{ color: '#A89F91', fontSize: '14px', marginTop: '4px' }}>Sign in to manage your store</p>
        </CardHeader>
        <CardContent>
          {error && (
            <div style={{ 
              backgroundColor: '#FFF5F5', 
              color: '#8C6A4A', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '16px',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#4A3F2F' }}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A89F91' }} />
                <Input 
                  value={username} 
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter username"
                  style={{ paddingLeft: '40px', height: '44px' }}
                  required
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#4A3F2F' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A89F91' }} />
                <Input 
                  type="password"
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{ paddingLeft: '40px', height: '44px' }}
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%', 
                height: '44px', 
                backgroundColor: '#6B7D5C', 
                color: 'white',
                fontSize: '15px',
                fontWeight: '500',
                marginTop: '8px'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
