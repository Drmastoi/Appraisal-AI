import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireUser, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { DEFAULT_SECTIONS } from "@/lib/appraisal";

const createSchema = z.object({
  sectionKey: z.string().refine((k) => DEFAULT_SECTIONS.includes(k), "Unknown section"),
  body: z.string().min(1).max(4000),
  parentId: z.string().optional(),
});

async function involvedAppraisal(user: { id: string; role: string }, appraisalId: string) {
  const appraisal = await prisma.appraisal.findUnique({ where: { id: appraisalId } });
  if (!appraisal) throw new ApiError(404, "Appraisal not found");
  const isDoctor = user.role === "DOCTOR" && appraisal.doctorId === user.id;
  const isAppraiser = user.role === "APPRAISER" && appraisal.appraiserId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isDoctor && !isAppraiser && !isAdmin) throw new ApiError(403, "Not permitted");
  return { appraisal, isDoctor, isAppraiser };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    await involvedAppraisal(user, id);
    const comments = await prisma.appraiserComment.findMany({
      where: { appraisalId: id },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ comments });
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    const { appraisal } = await involvedAppraisal(user, id);
    const body = createSchema.parse(await req.json());
    if (appraisal.status === "SIGNED_OFF") throw new ApiError(409, "Appraisal is signed off — commenting is closed");

    const comment = await prisma.appraiserComment.create({
      data: { appraisalId: id, sectionKey: body.sectionKey, authorId: user.id, body: body.body, parentId: body.parentId ?? null },
      include: { author: { select: { name: true, role: true } } },
    });
    if (user.role === "APPRAISER") {
      await notify(appraisal.doctorId, "New comment on your appraisal", `${user.name} commented on ${body.sectionKey.replace(/_/g, " ")}.`, "/doctor/appraisal");
    } else if (appraisal.appraiserId) {
      await notify(appraisal.appraiserId, "Doctor replied to your comment", `${user.name} replied on ${body.sectionKey.replace(/_/g, " ")}.`, `/appraiser/appraisals/${id}`);
    }
    await audit({ actorId: user.id, actorRole: user.role, action: "COMMENT_CREATE", entityType: "AppraiserComment", entityId: comment.id, meta: { sectionKey: body.sectionKey } });
    return NextResponse.json({ ok: true, comment }, { status: 201 });
  });
}
