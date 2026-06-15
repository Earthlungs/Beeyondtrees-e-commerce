"use client"

// Theme: "system" (default — follows the OS), "light", or "dark". The actual
// .dark class is applied to <html> here and (to avoid a flash) by the inline
// script in app/layout.tsx on first paint.
import { useEffect, useState } from "react"

export type Theme = "system" | "light" | "dark"

export function getStoredTheme(): Theme {
  if (typeof localStorage === "undefined") return "system"
  const t = localStorage.getItem("theme")
  return t === "light" || t === "dark" ? t : "system"
}

function prefersDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function applyTheme(t: Theme) {
  const dark = t === "dark" || (t === "system" && prefersDark())
  document.documentElement.classList.toggle("dark", dark)
}

// Hook for the settings switcher + keeps "system" in sync with the OS while open.
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>("system")

  useEffect(() => {
    setThemeState(getStoredTheme())
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => { if (getStoredTheme() === "system") applyTheme("system") }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const setTheme = (t: Theme) => {
    localStorage.setItem("theme", t)
    applyTheme(t)
    setThemeState(t)
  }
  return [theme, setTheme]
}
