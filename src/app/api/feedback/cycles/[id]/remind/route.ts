import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const { id } = await params;
    const cycle = await prisma.feedbackCycle.findUnique({ where: { id }, include: { appraisal: true, invites: true } });
    if (!cycle) throw new ApiError(404, "Feedback cycle not found");
    if (cycle.appraisal.doctorId !== user.id) throw new ApiError(403, "Not your cycle");
    if (cycle.status !== "OPEN") throw new ApiError(409, "Cycle is closed");
    const pending = cycle.invites.filter((i) => !i.completed).length;
    // In production this would send email/SMS via the configured provider. For now
    // we record the intent as an audit event and surface it in the notification log.
    await audit({ actorId: user.id, actorRole: user.role, action: "MSF_REMIND", entityType: "FeedbackCycle", entityId: id, meta: { pending } });
    return NextResponse.json({ ok: true, pending, note: `Reminder noted for ${pending} pending invite(s). In production this triggers email/SMS via the configured provider.` });
  });
}
