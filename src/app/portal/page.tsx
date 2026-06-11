"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import { signIn } from "next-auth/react"
import { cn } from "@/lib/utils"

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
      setCodeError("Invalid access code. Please check with your administrator.")
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
      setError("Invalid username or password.")
    } else {
      router.push("/admin")
    }
    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      setError("All fields are required.")
      setLoading(false)
      return
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/portal-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: "merchant" }),
      })

      const data = await res.json()

      if (data.success) {
        const loginResult = await signIn("credentials", {
          username: form.username,
          password: form.password,
          redirect: false,
        })

        if (loginResult?.error) {
          setError("Account created but sign-in failed. Please sign in manually.")
          setMode("login")
        } else {
          router.push("/admin")
        }
      } else {
        setError(data.error || "Registration failed. Please try again.")
      }
    } catch {
      setError("Network error. Please check your connection and try again.")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex min-h-[calc(100vh-60px)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl text-foreground">
              {step === "gate"
                ? "Staff Access"
                : mode === "login"
                  ? "Staff Sign In"
                  : "Create Staff Account"}
            </CardTitle>
            <CardDescription>
              {step === "gate"
                ? "Enter your staff access code to continue"
                : mode === "login"
                  ? "Sign in to manage products and orders"
                  : "Register as a merchant staff member"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === "gate" ? (
              <form onSubmit={handleGateSubmit} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter access code"
                    className="h-11 pl-10 text-center tracking-widest"
                    autoFocus
                  />
                </div>
                {codeError && (
                  <p className="text-center text-sm text-destructive">{codeError}</p>
                )}
                <Button type="submit" className="h-11 w-full">
                  Access Portal
                </Button>
              </form>
            ) : (
              <>
                <div className="mb-5 flex gap-1 rounded-lg bg-muted p-1">
                  {(["login", "register"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setMode(tab)
                        setError("")
                      }}
                      className={cn(
                        "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        mode === tab
                          ? tab === "login"
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab === "login" ? "Sign In" : "Create Account"}
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-center text-sm text-destructive">
                    {error}
                  </div>
                )}

                <form
                  onSubmit={mode === "login" ? handleLogin : handleRegister}
                  className="space-y-4"
                >
                  {mode === "register" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="John Doe"
                        className="h-10"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      placeholder="Enter username"
                      className="h-10"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Enter password"
                        className="h-10 pr-10"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "h-11 w-full",
                      mode === "register" && "bg-accent hover:bg-accent/90"
                    )}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Please wait...
                      </>
                    ) : mode === "login" ? (
                      "Sign In"
                    ) : (
                      "Create Account"
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("gate")
                      setError("")
                    }}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    Back to access code
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
