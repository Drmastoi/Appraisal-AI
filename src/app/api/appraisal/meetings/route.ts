import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export async function GET() {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const year = new Date().getFullYear();
    const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
    if (!appraisal) return NextResponse.json({ meetings: [] });
    const meetings = await prisma.appraisalMeeting.findMany({ where: { appraisalId: appraisal.id }, orderBy: { scheduledAt: "asc" } });
    return NextResponse.json({ meetings });
  });
}

export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const { scheduledAt, location, notes } = (await req.json()) as { scheduledAt: string; location?: string; notes?: string };
    if (!scheduledAt) throw new ApiError(422, "scheduledAt is required");
    const year = new Date().getFullYear();
    const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
    if (!appraisal) throw new ApiError(404, "Create your appraisal first");
    const meeting = await prisma.appraisalMeeting.create({
      data: { appraisalId: appraisal.id, scheduledAt: new Date(scheduledAt), location: location?.slice(0, 300) ?? null, notes: notes?.slice(0, 2000) ?? null, createdById: user.id },
    });
    await prisma.appraisal.update({ where: { id: appraisal.id }, data: { appraisalMeetingDate: new Date(scheduledAt) } });
    if (appraisal.appraiserId) await notify(appraisal.appraiserId, "Appraisal meeting scheduled", `${user.name} scheduled their appraisal meeting for ${new Date(scheduledAt).toLocaleDateString("en-GB")}${location ? ` — ${location}` : ""}.`, `/appraiser/appraisals/${appraisal.id}`);
    await audit({ actorId: user.id, actorRole: user.role, action: "MEETING_SCHEDULE", entityType: "AppraisalMeeting", entityId: meeting.id });
    return NextResponse.json({ ok: true, meeting }, { status: 201 });
  });
}
