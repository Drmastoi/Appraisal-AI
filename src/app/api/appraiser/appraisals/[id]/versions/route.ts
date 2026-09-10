import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { appraisalForAdminOrAppraiser } from "@/lib/appraisal-access";

const querySchema = z.object({ sectionKey: z.string().min(1) });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    const appraisal = await appraisalForAdminOrAppraiser(user, id);
    const { sectionKey } = querySchema.parse({ sectionKey: new URL(req.url).searchParams.get("sectionKey") ?? "" });

    const section = await prisma.appraisalSection.findUnique({
      where: { appraisalId_sectionKey: { appraisalId: appraisal.id, sectionKey } },
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { section: false },
        },
      },
    });
    if (!section) return NextResponse.json({ versions: [] });
    const versions = await prisma.sectionVersion.findMany({
      where: { sectionId: section.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { section: { select: { sectionKey: true } } },
    });
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(new Set(versions.map((v) => v.editedById))) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    return NextResponse.json({
      versions: versions.map((v) => ({
        id: v.id, sectionKey: v.section.sectionKey, data: JSON.parse(v.data), editedByRole: v.editedByRole,
        editedByName: nameById.get(v.editedById) ?? "unknown", note: v.note, createdAt: v.createdAt,
      })),
    });
  });
}
