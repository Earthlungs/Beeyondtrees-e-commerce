// Mapbox helpers for the attendance map. Deliberately dependency-free: we use
// the Mapbox HTTP APIs (Geocoding v6 server-side, Static Images client-side)
// rather than mapbox-gl, so no extra bundle weight and no CSS import.
//
// Token: NEXT_PUBLIC_MAPBOX_TOKEN is a public (pk.*) token — it is embedded in
// the static-image URLs the browser loads, so it MUST be URL-restricted in the
// Mapbox dashboard. MAPBOX_TOKEN (optional, server-only) is preferred for the
// reverse-geocoding call. Everything degrades gracefully when no token is set:
// coordinates are still recorded and the UI falls back to an OpenStreetMap link.

export const MAPBOX_PUBLIC_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

function serverToken(): string {
  return process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""
}

export interface Coords {
  latitude: number
  longitude: number
}

// True only for a real, in-range fix. Rejects NaN and the 0,0 "null island"
// value some browsers hand back when a fix fails.
export function isValidCoords(lat: unknown, lng: unknown): boolean {
  const la = Number(lat)
  const ln = Number(lng)
  return (
    Number.isFinite(la) && Number.isFinite(ln) &&
    la >= -90 && la <= 90 && ln >= -180 && ln <= 180 &&
    !(la === 0 && ln === 0)
  )
}

// Reverse-geocode a fix to a human-readable address. Never throws — attendance
// must be recordable even when Mapbox is down or unconfigured, so a failure
// just leaves `address` null and the map still renders from the coordinates.
export async function reverseGeocode({ latitude, longitude }: Coords): Promise<string | null> {
  const token = serverToken()
  if (!token) return null
  try {
    const url =
      `https://api.mapbox.com/search/geocode/v6/reverse` +
      `?longitude=${encodeURIComponent(longitude)}&latitude=${encodeURIComponent(latitude)}` +
      `&limit=1&access_token=${encodeURIComponent(token)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const data = (await res.json()) as {
      features?: { properties?: { full_address?: string; place_formatted?: string; name?: string } }[]
    }
    const p = data.features?.[0]?.properties
    return p?.full_address || p?.place_formatted || p?.name || null
  } catch {
    return null
  }
}

// Static map thumbnail/detail image. `zoom` 14–16 reads well for a street-level
// pin. Returns "" when unconfigured so callers can render the fallback.
export function staticMapUrl({
  latitude, longitude, width = 600, height = 280, zoom = 15, color = "6B7D5C",
}: Coords & { width?: number; height?: number; zoom?: number; color?: string }): string {
  if (!MAPBOX_PUBLIC_TOKEN) return ""
  const pin = `pin-l+${color}(${longitude},${latitude})`
  return (
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pin}/` +
    `${longitude},${latitude},${zoom},0/${width}x${height}@2x` +
    `?access_token=${MAPBOX_PUBLIC_TOKEN}`
  )
}

// Fallback / "open bigger" links that need no API key.
export function osmUrl({ latitude, longitude }: Coords): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`
}

export function googleMapsUrl({ latitude, longitude }: Coords): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
}

export function formatCoords({ latitude, longitude }: Coords): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}
