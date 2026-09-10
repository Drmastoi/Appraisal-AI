import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { generateInviteToken } from "@/lib/ratelimit";

const inviteSchema = z.object({
  invites: z.array(z.object({ recipientName: z.string().max(120).optional(), relationship: z.string().max(120).optional() })).min(1).max(60),
});

const patchSchema = z.object({ action: z.enum(["CLOSE", "REOPEN"]) });

async function ownedCycle(userId: string, id: string) {
  const cycle = await prisma.feedbackCycle.findUnique({ where: { id }, include: { appraisal: true, _count: { select: { invites: true, responses: true } } } });
  if (!cycle) throw new ApiError(404, "Feedback cycle not found");
  if (cycle.appraisal.doctorId !== userId) throw new ApiError(403, "Not your feedback cycle");
  return cycle;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const { id } = await params;
    const cycle = await ownedCycle(user.id, id);
    const invites = await prisma.feedbackInvite.findMany({ where: { cycleId: cycle.id }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({
      cycle: { id: cycle.id, cycleType: cycle.cycleType, status: cycle.status, minResponses: cycle.minResponses, responseCount: cycle._count.responses },
      invites: invites.map((i) => ({
        id: i.id,
        recipientName: i.recipientName,
        relationship: i.relationship,
        completed: i.completed,
        // The full link is returned so the doctor can copy/share it. Invite
        // tokens are randomised and responses are stored anonymously.
        url: `/feedback/${i.token}`,
      })),
    });
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const { id } = await params;
    const cycle = await ownedCycle(user.id, id);
    if (cycle.status !== "OPEN") throw new ApiError(409, "Cycle is closed");
    const body = inviteSchema.parse(await req.json());
    const created = await prisma.$transaction(
      body.invites.map((i) =>
        prisma.feedbackInvite.create({
          data: { cycleId: cycle.id, token: generateInviteToken(), recipientName: i.recipientName ?? null, relationship: i.relationship ?? null },
        })
      )
    );
    await audit({ actorId: user.id, actorRole: user.role, action: "FEEDBACK_INVITES_CREATE", entityType: "FeedbackCycle", entityId: cycle.id, meta: { count: created.length } });
    return NextResponse.json({ ok: true, created: created.length }, { status: 201 });
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const { id } = await params;
    const cycle = await ownedCycle(user.id, id);
    const body = patchSchema.parse(await req.json());
    if (body.action === "CLOSE") {
      await prisma.feedbackCycle.update({ where: { id: cycle.id }, data: { status: "CLOSED", closedAt: new Date() } });
      await audit({ actorId: user.id, actorRole: user.role, action: "FEEDBACK_CYCLE_CLOSE", entityType: "FeedbackCycle", entityId: cycle.id });
    } else {
      await prisma.feedbackCycle.update({ where: { id: cycle.id }, data: { status: "OPEN", closedAt: null } });
    }
    return NextResponse.json({ ok: true });
  });
}
