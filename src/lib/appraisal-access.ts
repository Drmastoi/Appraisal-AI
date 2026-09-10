import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";

export async function appraisalForAppraiser(user: SessionUser, appraisalId: string) {
  const appraisal = await prisma.appraisal.findUnique({
    where: { id: appraisalId },
    include: { doctor: true, appraiser: true },
  });
  if (!appraisal) throw new ApiError(404, "Appraisal not found");
  if (appraisal.appraiserId !== user.id) throw new ApiError(403, "This appraisal is not assigned to you");
  return appraisal;
}

export async function appraisalForAdminOrAppraiser(user: SessionUser, appraisalId: string) {
  const appraisal = await prisma.appraisal.findUnique({ where: { id: appraisalId }, include: { doctor: true, appraiser: true } });
  if (!appraisal) throw new ApiError(404, "Appraisal not found");
  if (user.role !== "ADMIN" && appraisal.appraiserId !== user.id) throw new ApiError(403, "Not permitted");
  return appraisal;
}
