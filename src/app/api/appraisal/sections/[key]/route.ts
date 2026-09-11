import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { DEFAULT_SECTIONS } from "@/lib/appraisal";

const bodySchema = z.object({ data: z.record(z.string(), z.unknown()) });

type Ctx = { params: Promise<{ key: string }> };

async function saveSection(req: Request, { params }: Ctx) {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const { key } = await params;
    if (!DEFAULT_SECTIONS.includes(key)) throw new ApiError(404, "Unknown section");
    const body = bodySchema.parse(await req.json());

    const year = new Date().getFullYear();
    const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
    if (!appraisal) throw new ApiError(404, "No appraisal for the current year — ask an administrator to create one");
    if (appraisal.status !== "DRAFT") throw new ApiError(409, "Appraisal is submitted and locked for editing");

    const data = JSON.stringify(body.data);
    await prisma.appraisalSection.upsert({
      where: { appraisalId_sectionKey: { appraisalId: appraisal.id, sectionKey: key } },
      update: { data },
      create: { appraisalId: appraisal.id, sectionKey: key, data },
    });
    await audit({ actorId: user.id, actorRole: user.role, action: "SECTION_SAVE", entityType: "AppraisalSection", entityId: `${appraisal.id}:${key}` });
    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
  });
}

/** Autosave while the doctor types. */
export async function PUT(req: Request, ctx: Ctx) {
  return saveSection(req, ctx);
}

/**
 * Same save, reached as POST so an unload/close flush can use
 * `navigator.sendBeacon`, which only issues POST requests.
 */
export async function POST(req: Request, ctx: Ctx) {
  return saveSection(req, ctx);
}
