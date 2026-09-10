import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { appraisalForAppraiser } from "@/lib/appraisal-access";

const schema = z.object({ action: z.enum(["START_REVIEW", "REQUEST_CHANGES"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireRole("APPRAISER");
    const { id } = await params;
    const appraisal = await appraisalForAppraiser(user, id);
    const body = schema.parse(await req.json());

    if (body.action === "START_REVIEW") {
      if (appraisal.status !== "SUBMITTED") throw new ApiError(409, "Only submitted appraisals can move into review");
      await prisma.appraisal.update({ where: { id }, data: { status: "IN_REVIEW" } });
      await notify(appraisal.doctorId, "Appraisal under review", `${user.name} has started reviewing your ${appraisal.year}/${String(appraisal.year + 1).slice(2)} appraisal.`, "/doctor/appraisal");
      await audit({ actorId: user.id, actorRole: user.role, action: "APPRAISAL_REVIEW_START", entityType: "Appraisal", entityId: id });
      return NextResponse.json({ ok: true, status: "IN_REVIEW" });
    }

    // REQUEST_CHANGES
    if (appraisal.status !== "IN_REVIEW" && appraisal.status !== "SUBMITTED") {
      throw new ApiError(409, "Changes can only be requested before sign-off");
    }
    await prisma.appraisal.update({ where: { id }, data: { status: "DRAFT", submittedAt: null } });
    await notify(appraisal.doctorId, "Changes requested on your appraisal", `${user.name} has returned your appraisal for updates before sign-off.`, "/doctor/appraisal");
    await audit({ actorId: user.id, actorRole: user.role, action: "APPRAISAL_CHANGES_REQUESTED", entityType: "Appraisal", entityId: id });
    return NextResponse.json({ ok: true, status: "DRAFT" });
  });
}
