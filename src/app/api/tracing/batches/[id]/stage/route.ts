import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { createNumbered, parseDate } from "@/lib/docs"
import { requireStage, nextStage, isStage, type Stage } from "@/lib/tracing"
import { STAGE_LABELS, STAGE_ROLES, ROLE_LABELS } from "@/lib/tracing-stages"
import { sendMail } from "@/lib/mailer"
import { stageAdvanceEmail, batchApprovedEmail, batchRejectedEmail, batchCompletedEmail } from "@/lib/email-templates"

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

async function emailsForRole(role: string): Promise<string[]> {
  const users = await prisma.user.findMany({ where: { role }, select: { email: true } })
  return users.flatMap((u) => u.email ? [u.email] : [])
}

// Email of the user who created the batch's LPO (the designated receiver).
async function lpoCreatorEmail(batchId: string): Promise<string[]> {
  try {
    const rows = await prisma.$queryRaw<{ uid: string | null; nm: string | null }[]>`
      SELECT "lpoCreatedByUserId" AS uid, "lpoCreatedByName" AS nm FROM "Batch" WHERE id = ${batchId}
    `
    const r = rows[0]
    if (!r) return []
    const user = r.uid
      ? await prisma.user.findUnique({ where: { id: r.uid }, select: { email: true } })
      : r.nm
        ? await prisma.user.findFirst({ where: { name: r.nm }, select: { email: true } })
        : null
    return user?.email ? [user.email] : []
  } catch { return [] }
}

async function notifyNextStage(batchId: string, batchCode: string, productName: string, nextSt: Stage) {
  const stageName = STAGE_LABELS[nextSt] ?? nextSt
  const batchUrl = `${BASE_URL}/admin/tracing/${batchId}`
  // Receiving is done by the LPO creator (dynamic), not the legacy receiving_officer.
  const roleName = nextSt === "receiving" ? "LPO Creator (Receiver)" : (ROLE_LABELS[STAGE_ROLES[nextSt]] ?? nextSt)
  const to = nextSt === "receiving" ? await lpoCreatorEmail(batchId) : await emailsForRole(STAGE_ROLES[nextSt])
  const adminEmails = await emailsForRole("admin")
  const all = [...new Set([...to, ...adminEmails])]
  if (all.length === 0) return
  await sendMail({
    to: all,
    subject: `[Beeyond Trees] Action required: ${stageName} — ${batchCode}`,
    html: stageAdvanceEmail({ batchCode, productName, stageName, roleName, batchUrl }),
  }).catch((e) => console.error("[mailer] stage advance:", e))
}

const num = (v: unknown) => Number(v) || 0
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "")
const imgs = (v: unknown) => (Array.isArray(v) ? v : []) as Prisma.InputJsonValue

// Submit one stage of a batch. Body: { stage, action?, data }.
// requireStage enforces role ownership + the sequential lock, then we write the
// stage row and advance the batch pointer (or complete/reject it).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body || !isStage(body.stage)) {
    return NextResponse.json({ error: "Unknown stage." }, { status: 400 })
  }
  const stage = body.stage as Stage
  const action: string = body.action ?? "submit"
  const d = body.data ?? {}

  const batch = await prisma.batch.findUnique({ where: { id } })
  if (!batch) return NextResponse.json({ error: "Batch not found." }, { status: 404 })

  const auth = await requireStage(request, stage, batch)
  if (auth instanceof NextResponse) return auth

  const advance = async () => {
    const next = nextStage(stage)
    const updated = await prisma.batch.update({
      where: { id },
      data: next ? { stage: next } : { status: "completed" },
    })
    // Fire-and-forget email — never block the response
    if (next) {
      await notifyNextStage(id, batch.code, batch.productName ?? "", next)
    } else {
      // Batch completed — notify admins
      const adminEmails = await emailsForRole("admin")
      if (adminEmails.length > 0) {
        await sendMail({
          to: adminEmails,
          subject: `[Beeyond Trees] Batch ${batch.code} completed`,
          html: batchCompletedEmail({ batchCode: batch.code, productName: batch.productName ?? "", batchUrl: `${BASE_URL}/admin/tracing/${id}` }),
        }).catch((e) => console.error("[mailer] batch completed:", e))
      }
    }
    return updated
  }

  try {
    switch (stage) {
      // ── Stage 2: Executive approval (accept / reject) ──────────────────────
      case "approval": {
        const decision = action === "reject" ? "rejected" : "accepted"
        const approvedBy = str(d.approvedBy) || str(auth.token.name) || "Executive"
        if (decision === "rejected" && !str(d.reason)) {
          return NextResponse.json({ error: "A reason is required to reject." }, { status: 400 })
        }
        await prisma.approval.create({
          data: { batchId: id, decision, reason: str(d.reason) || null, approvedBy },
        })
        if (decision === "rejected") {
          await prisma.batch.update({ where: { id }, data: { status: "rejected" } })
          await prisma.bulkRequest.update({ where: { batchId: id }, data: { status: "rejected" } })
          // Notify the factory manager who raised the request
          const br = await prisma.bulkRequest.findUnique({ where: { batchId: id }, select: { requestedBy: true } })
          const fmEmails = await emailsForRole("factory_manager")
          if (fmEmails.length > 0) {
            await sendMail({
              to: fmEmails,
              subject: `[Beeyond Trees] Batch ${batch.code} rejected`,
              html: batchRejectedEmail({ batchCode: batch.code, productName: batch.productName ?? "", approvedBy, reason: str(d.reason), batchUrl: `${BASE_URL}/admin/tracing/${id}` }),
            }).catch((e) => console.error("[mailer] batch rejected:", e))
          }
          void br // suppress unused warning
        } else {
          await prisma.bulkRequest.update({
            where: { batchId: id },
            data: { status: "approved", approvedBy },
          })
          await advance() // advance() fires notifyNextStage internally
          // Also notify the factory manager that their request was approved
          const fmEmails = await emailsForRole("factory_manager")
          if (fmEmails.length > 0) {
            await sendMail({
              to: fmEmails,
              subject: `[Beeyond Trees] Batch ${batch.code} approved`,
              html: batchApprovedEmail({ batchCode: batch.code, productName: batch.productName ?? "", approvedBy, batchUrl: `${BASE_URL}/admin/tracing/${id}` }),
            }).catch((e) => console.error("[mailer] batch approved:", e))
          }
        }
        break
      }

      // ── Stage 3: Procurement — sourcing / harvest ──────────────────────────
      case "sourcing": {
        const totalHarvestCost =
          num(d.totalHarvestCost) ||
          +(num(d.laborCost) + num(d.transportCost) + num(d.otherCosts)).toFixed(2)
        await createNumbered(
          "HRV",
          () => prisma.sourcing.count(),
          (harvestId) =>
            prisma.sourcing.create({
              data: {
                batchId: id,
                harvestId,
                materialName: str(d.materialName) || batch.productName || "",
                sourceLocation: str(d.sourceLocation),
                gps: str(d.gps) || null,
                quantityHarvested: num(d.quantityHarvested),
                laborCost: num(d.laborCost),
                transportCost: num(d.transportCost),
                otherCosts: num(d.otherCosts),
                totalHarvestCost,
                supervisor: str(d.supervisor) || null,
                images: imgs(d.images),
                remarks: str(d.remarks) || null,
              },
            })
        )
        await advance()
        break
      }

      // ── Stage 4: Quality inspector ─────────────────────────────────────────
      case "inspection": {
        // Harvest ID is auto-pulled from the sourcing stage, never typed.
        const srcForInsp = await prisma.sourcing.findUnique({ where: { batchId: id }, select: { harvestId: true } })
        await createNumbered(
          "RCV",
          () => prisma.inspection.count(),
          (receivingId) =>
            prisma.inspection.create({
              data: {
                batchId: id,
                receivingId,
                harvestId: srcForInsp?.harvestId ?? null,
                materialName: str(d.materialName) || batch.productName || "",
                quantityDelivered: num(d.quantityDelivered),
                quantityAccepted: num(d.quantityAccepted),
                quantityRejected: num(d.quantityRejected),
                qualityGrade: str(d.qualityGrade) || null,
                inspector: str(d.inspector) || str(auth.token.name) || "Inspector",
                storeLocation: str(d.storeLocation) || null,
                images: imgs(d.images),
                remarks: str(d.remarks) || null,
              },
            })
        )
        await advance()
        break
      }

      // ── Stage 5: Requisition officer — multi-row, multi-user ───────────────
      case "requisition": {
        if (action === "advance") {
          const count = await prisma.requisition.count({ where: { batchId: id } })
          if (count === 0) {
            return NextResponse.json({ error: "Add at least one requisition first." }, { status: 400 })
          }
          await advance()
          break
        }
        if (!str(d.product)) {
          return NextResponse.json({ error: "Product is required." }, { status: 400 })
        }
        // Can't requisition more than QC accepted: cap the running total against
        // the inspection's quantityAccepted (0 = no cap recorded yet).
        const insp = await prisma.inspection.findUnique({ where: { batchId: id }, select: { quantityAccepted: true } })
        const accepted = insp?.quantityAccepted ?? 0
        if (accepted > 0) {
          const agg = await prisma.requisition.aggregate({ where: { batchId: id }, _sum: { quantityRequired: true } })
          const used = agg._sum.quantityRequired ?? 0
          const want = num(d.quantityRequired)
          if (used + want > accepted) {
            return NextResponse.json(
              { error: `Only ${accepted - used} of ${accepted} accepted units remain — can't requisition ${want}.` },
              { status: 400 }
            )
          }
        }
        await createNumbered(
          "REQ",
          () => prisma.requisition.count(),
          (requisitionId) =>
            prisma.requisition.create({
              data: {
                batchId: id,
                requisitionId,
                department: str(d.department),
                product: str(d.product),
                quantityRequired: num(d.quantityRequired),
                purpose: str(d.purpose) || null,
                requestedBy: str(d.requestedBy) || str(auth.token.name) || "Requisition Officer",
                status: "pending",
              },
            })
        )
        // Stay on the requisition stage so more officers can add rows.
        break
      }

      // ── Stage 6: Agribusiness manager — issuance ───────────────────────────
      // Issuance is NOT a fresh form — it is driven by the requisitions. The
      // manager issues each requisition (auto-filled); once every requisition is
      // issued the stage locks and they proceed to production.
      case "issuance": {
        const reqs = await prisma.requisition.findMany({ where: { batchId: id }, orderBy: { createdAt: "asc" } })
        if (reqs.length === 0) {
          return NextResponse.json({ error: "There are no requisitions to issue against." }, { status: 400 })
        }

        // Issue ONE requisition (mark it issued). The manager just confirms the
        // auto-filled details — nothing to retype. Stays on the issuance stage.
        if (action === "issue") {
          const reqId = str(d.requisitionId)
          const target = reqs.find((r) => r.id === reqId || r.requisitionId === reqId)
          if (!target) return NextResponse.json({ error: "Requisition not found." }, { status: 404 })
          if (target.status !== "issued") {
            await prisma.requisition.update({ where: { id: target.id }, data: { status: "issued" } })
          }
          break // stay on issuance until everything is issued
        }

        // Proceed to production: every requisition must be issued first.
        const pending = reqs.filter((r) => r.status !== "issued")
        if (pending.length > 0) {
          return NextResponse.json({ error: `Issue all requisitions first — ${pending.length} still pending.` }, { status: 400 })
        }
        const totalQty = reqs.reduce((s, r) => s + (r.quantityRequired || 0), 0)
        const first = reqs[0]
        // Single issuance summary, auto-derived from the requisitions + batch.
        await prisma.issuance.create({
          data: {
            batchId: id,
            requisitionId: first.requisitionId,
            department: first.department || "",
            product: batch.productName || first.product || "",
            numberToManufacture: Math.trunc(totalQty),
            material: first.product || "",
            quantityRequired: totalQty,
            purpose: first.purpose || null,
            requestedBy: first.requestedBy || str(auth.token.name) || "Agribusiness Manager",
            approvedBy: str(auth.token.name) || null,
            status: "issued",
          },
        })
        await advance()
        break
      }

      // ── Stage 7: Production officer ────────────────────────────────────────
      case "production": {
        // Can't finalise production until progress reaches 100% (logged steps).
        try {
          const rows = await prisma.$queryRaw<{ pct: number }[]>`
            SELECT COALESCE(MAX(percent), 0)::int AS pct FROM "ProductionStep" WHERE "batchId" = ${id}
          `
          const pct = rows[0]?.pct ?? 0
          if (pct < 100) {
            return NextResponse.json({ error: `Production is only ${pct}% complete — log steps to 100% before finalising.` }, { status: 409 })
          }
        } catch { /* steps table missing — allow (legacy) */ }

        // Production captures named overhead cost lines (electricity, labour, …).
        // totalCost is their sum — the figure the reconciliation rolls up.
        const rawCosts = Array.isArray(d.costs) ? d.costs : []
        const costs = rawCosts
          .map((c: unknown) => {
            const r = (c ?? {}) as { name?: unknown; amount?: unknown }
            return { name: str(r.name), amount: num(r.amount) }
          })
          .filter((c: { name: string; amount: number }) => c.name || c.amount)
        const totalCost = +costs.reduce((s: number, c: { amount: number }) => s + c.amount, 0).toFixed(2)
        const reqForProd = await prisma.requisition.findFirst({ where: { batchId: id }, orderBy: { createdAt: "asc" }, select: { requisitionId: true } })
        await createNumbered(
          "ISS",
          () => prisma.production.count(),
          (issueId) =>
            prisma.production.create({
              data: {
                batchId: id,
                issueId,
                requisitionId: reqForProd?.requisitionId ?? null,
                material: str(d.material) || batch.productName || "",
                quantityIssued: 0,
                unitCost: 0,
                totalCost,
                costs: costs as unknown as Prisma.InputJsonValue,
                issuedBy: str(d.issuedBy) || str(auth.token.name) || "Production Officer",
                receivedBy: str(d.receivedBy) || null,
                date: parseDate(d.date),
                remarks: str(d.remarks) || null,
              },
            })
        )
        await advance()
        break
      }

      // ── Stage 8: Dispatch officer ──────────────────────────────────────────
      case "dispatch": {
        await createNumbered(
          "DSP",
          () => prisma.batchDispatch.count(),
          (dispatchId) =>
            prisma.batchDispatch.create({
              data: {
                batchId: id,
                dispatchId,
                product: str(d.product) || batch.productName || "",
                quantity: num(d.quantity),
                sourceLocation: str(d.sourceLocation) || null,
                destination: str(d.destination) || null,
                transportCost: num(d.transportCost),
                dispatchedBy: str(d.dispatchedBy) || str(auth.token.name) || "Dispatch Officer",
                toBeReceivedBy: str(d.toBeReceivedBy) || null,
                date: parseDate(d.date),
                remarks: str(d.remarks) || null,
              },
            })
        )
        await advance()
        break
      }

      // ── Stage 9: Receiving officer (final) ─────────────────────────────────
      case "receiving": {
        // Dispatch ID is auto-pulled from the dispatch stage.
        const dspForRcv = await prisma.batchDispatch.findUnique({ where: { batchId: id }, select: { dispatchId: true } })
        await prisma.receiving.create({
          data: {
            batchId: id,
            dispatchId: dspForRcv?.dispatchId ?? null,
            product: str(d.product) || batch.productName || "",
            quantityReceived: num(d.quantityReceived),
            condition: str(d.condition) || null,
            variance: num(d.variance),
            receiver: str(d.receiver) || str(auth.token.name) || "Receiving Officer",
            images: imgs(d.images),
            remarks: str(d.remarks) || null,
          },
        })
        await advance() // last stage → marks the batch completed
        break
      }

      // bulk_request is created via POST /api/tracing/batches, not here.
      default:
        return NextResponse.json({ error: "This stage cannot be submitted here." }, { status: 400 })
    }

    const updated = await prisma.batch.findUnique({
      where: { id },
      include: {
        bulkRequest: true,
        approval: true,
        sourcing: true,
        inspection: true,
        requisitions: { orderBy: { createdAt: "asc" } },
        issuance: true,
        production: true,
        dispatch: true,
        receiving: true,
      },
    })
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "This stage was already submitted for the batch." }, { status: 409 })
    }
    console.error(`Stage "${stage}" submit failed:`, e)
    return NextResponse.json({ error: "Could not save this stage. Please try again." }, { status: 500 })
  }
}
