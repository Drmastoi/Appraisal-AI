import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireUser, ApiError } from "@/lib/auth";

const schema = z.object({ resolved: z.boolean() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id, commentId } = await params;
    const comment = await prisma.appraiserComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.appraisalId !== id) throw new ApiError(404, "Comment not found");
    const appraisal = await prisma.appraisal.findUnique({ where: { id } });
    const canResolve =
      comment.authorId === user.id ||
      (user.role === "APPRAISER" && appraisal?.appraiserId === user.id) ||
      user.role === "ADMIN";
    if (!canResolve) throw new ApiError(403, "Not permitted");
    const body = schema.parse(await req.json());
    await prisma.appraiserComment.update({ where: { id: commentId }, data: { resolved: body.resolved } });
    return NextResponse.json({ ok: true });
  });
}
