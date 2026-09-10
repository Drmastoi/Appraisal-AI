import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({
  submittedToGmc: z.boolean(),
  gmcConnectRef: z.string().max(100).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireRole("ADMIN");
    const { id } = await params;
    const body = schema.parse(await req.json());
    const existing = await prisma.rORecommendation.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Recommendation not found");
    await prisma.rORecommendation.update({
      where: { id },
      data: { submittedToGmc: body.submittedToGmc, gmcConnectRef: body.gmcConnectRef ?? null },
    });
    await audit({ actorId: admin.id, actorRole: admin.role, action: "RO_RECOMMENDATION_GMC_SUBMIT", entityType: "RORecommendation", entityId: id, meta: { ref: body.gmcConnectRef } });
    return NextResponse.json({ ok: true });
  });
}
