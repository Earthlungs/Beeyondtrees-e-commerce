import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireRole, ADMINISH_ROLES } from "@/lib/authz"
import { sendLpoRejectedToCreatorEmail } from "@/lib/doc-email"

// One-off backfill: emails the creator of every currently-rejected LPO with
// the "edit & resubmit" notice, now that rejections notify creators going
// forward (see PATCH /api/lpos/[id]).
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, [...ADMINISH_ROLES])
  if (auth instanceof NextResponse) return auth

  const actor = (auth.token as { name?: string }).name || "CEO"

  const rejected = await prisma.$queryRaw<{
    id: string; number: string; supplierName: string; total: number
    rejectionReason: string | null; createdByUserId: string | null; origin: string | null
  }[]>`
    SELECT id, number, "supplierName", total, "rejectionReason", "createdByUserId", "origin"
    FROM "Lpo" WHERE status = 'rejected'
  `

  // External Procurement users, fetched once — the fallback recipient list for
  // external LPOs that predate creator-tracking and have no createdByUserId.
  const epUsers = await prisma.user.findMany({ where: { role: "external_procurement" }, select: { email: true } })
  const epEmails = epUsers.flatMap((u) => u.email ? [u.email] : [])

  let notified = 0
  let skipped = 0
  for (const lpo of rejected) {
    try {
      let recipient: string | string[] | null = null
      if (lpo.createdByUserId) {
        const creator = await prisma.user.findUnique({ where: { id: lpo.createdByUserId }, select: { email: true } })
        recipient = creator?.email ?? null
      } else if (lpo.origin === "external" && epEmails.length > 0) {
        recipient = epEmails
      }
      if (!recipient) { skipped++; continue }
      await sendLpoRejectedToCreatorEmail(
        { id: lpo.id, number: lpo.number, supplierName: lpo.supplierName, total: Number(lpo.total) },
        actor,
        lpo.rejectionReason || "",
        recipient,
      )
      notified++
    } catch (e) {
      console.error("[mailer] LPO rejected backfill notify:", e)
      skipped++
    }
  }

  return NextResponse.json({ notified, skipped, total: rejected.length })
}
