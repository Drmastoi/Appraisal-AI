import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { appraisalForAppraiser } from "@/lib/appraisal-access";
import { DEFAULT_SECTIONS, sectionOwner } from "@/lib/appraisal";

const bodySchema = z.object({ data: z.record(z.string(), z.unknown()), note: z.string().max(500).optional() });

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; key: string }> }) {
  return handleApi(async () => {
    const user = await requireRole("APPRAISER");
    const { id, key } = await params;
    if (!DEFAULT_SECTIONS.includes(key)) throw new ApiError(404, "Unknown section");
    const appraisal = await appraisalForAppraiser(user, id);
    if (appraisal.status === "SIGNED_OFF") throw new ApiError(409, "Appraisal is signed off and locked");
    if (appraisal.status === "DRAFT" && sectionOwner(key) === "DOCTOR") {
      throw new ApiError(409, "The doctor is still editing this appraisal");
    }
    const body = bodySchema.parse(await req.json());
    const data = JSON.stringify(body.data);

    const section = await prisma.appraisalSection.upsert({
      where: { appraisalId_sectionKey: { appraisalId: id, sectionKey: key } },
      update: { data },
      create: { appraisalId: id, sectionKey: key, data },
    });

    // Every appraiser edit is recorded as an immutable version for the audit trail.
    await prisma.sectionVersion.create({
      data: { sectionId: section.id, data, editedByRole: "APPRAISER", editedById: user.id, note: body.note ?? null },
    });
    await audit({ actorId: user.id, actorRole: user.role, action: "SECTION_EDIT_APPRAISER", entityType: "AppraisalSection", entityId: `${id}:${key}` });
    return NextResponse.json({ ok: true });
  });
}
