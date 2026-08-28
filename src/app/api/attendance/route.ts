import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireUser, isAdminish } from "@/lib/authz"
import { nairobiDayRange } from "@/lib/attendance"
import { isValidCoords, reverseGeocode } from "@/lib/geo"

// Office sign in / sign out with a live GPS fix.
//
//   GET                      → my punches (+ whether I am currently signed in)
//   GET ?scope=all           → every staff member's punches (adminish only)
//   GET ?scope=all&date=…    → …for one Nairobi calendar day
//   GET ?scope=all&userId=…  → …for one staff member
//   POST { type, latitude, longitude, accuracy, note }
//
// Location is REQUIRED: recording where the punch happened is the whole point
// of the feature, so a punch without a valid fix is rejected rather than saved
// with a blank map.

export async function GET(request: NextRequest) {
  const me = await requireUser(request)
  if (me instanceof NextResponse) return me

  const params = request.nextUrl.searchParams
  const wantsAll = params.get("scope") === "all"

  if (wantsAll && !isAdminish(me.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const date = params.get("date")
  const userId = params.get("userId")

  const where: { userId?: string; at?: { gte: Date; lt: Date } } = {}
  if (wantsAll) {
    if (userId) where.userId = userId
  } else {
    where.userId = me.id
  }
  if (date) {
    const { start, end } = nairobiDayRange(date)
    where.at = { gte: start, lt: end }
  }

  const records = await prisma.attendance.findMany({
    where,
    orderBy: { at: "desc" },
    take: wantsAll ? 500 : 120,
  })

  // The caller's open session drives which button the UI shows.
  const open = await openSession(me.id)

  return NextResponse.json(
    { records, open, canViewAll: isAdminish(me.role) },
    { headers: { "Cache-Control": "no-store" } }
  )
}

export async function POST(request: NextRequest) {
  const me = await requireUser(request)
  if (me instanceof NextResponse) return me

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const type = String(body.type ?? "").trim()
  if (type !== "in" && type !== "out") {
    return NextResponse.json({ error: "type must be 'in' or 'out'." }, { status: 400 })
  }

  if (!isValidCoords(body.latitude, body.longitude)) {
    return NextResponse.json(
      { error: "We could not read your location. Allow location access and try again — sign in/out must record where you are." },
      { status: 400 }
    )
  }
  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)
  const accuracyRaw = Number(body.accuracy)
  const accuracy = Number.isFinite(accuracyRaw) && accuracyRaw >= 0 ? accuracyRaw : null

  // Enforce a sane in → out sequence within the Nairobi day. Scoping to the day
  // means a forgotten sign-out yesterday never blocks today's sign-in.
  const open = await openSession(me.id)
  if (type === "in" && open) {
    return NextResponse.json(
      { error: `You are already signed in (since ${open.at.toISOString()}). Sign out first.` },
      { status: 409 }
    )
  }
  if (type === "out" && !open) {
    return NextResponse.json(
      { error: "You have not signed in today, so there is nothing to sign out of." },
      { status: 409 }
    )
  }

  const at = new Date()
  const workedMins = type === "out" && open
    ? Math.max(0, Math.round((at.getTime() - open.at.getTime()) / 60_000))
    : null

  // Never let a geocoder hiccup lose the punch — reverseGeocode swallows its
  // own errors and returns null, and the coordinates are stored regardless.
  const address = await reverseGeocode({ latitude, longitude })

  const record = await prisma.attendance.create({
    data: {
      userId: me.id,
      userName: me.name,
      role: me.role,
      type,
      at,
      latitude,
      longitude,
      accuracy,
      address,
      note: typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 300) : null,
      device: (request.headers.get("user-agent") ?? "").slice(0, 200) || null,
      ip: (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
      workedMins,
    },
  })

  return NextResponse.json(record, { status: 201 })
}

// The most recent punch of the current Nairobi day, if it left the user signed
// in (i.e. it was an "in" with no "out" after it).
async function openSession(userId: string) {
  const { start, end } = nairobiDayRange()
  const last = await prisma.attendance.findFirst({
    where: { userId, at: { gte: start, lt: end } },
    orderBy: { at: "desc" },
  })
  return last?.type === "in" ? last : null
}
