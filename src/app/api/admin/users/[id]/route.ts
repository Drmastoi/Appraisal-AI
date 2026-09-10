import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({
  approved: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireRole("ADMIN");
    const { id } = await params;
    const body = schema.parse(await req.json());
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new ApiError(404, "User not found");
    if (target.role === "ADMIN" && body.active === false) {
      throw new ApiError(400, "Cannot deactivate an administrator account");
    }
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(body.approved !== undefined ? { approved: body.approved } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    });
    await audit({
      actorId: admin.id, actorRole: admin.role, action: "USER_UPDATE",
      entityType: "User", entityId: id,
      meta: { approved: body.approved, active: body.active, targetEmail: target.email },
    });
    return NextResponse.json({ ok: true, user: { id: user.id, approved: user.approved, active: user.active } });
  });
}
