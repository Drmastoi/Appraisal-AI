import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { DEFAULT_SECTIONS } from "@/lib/appraisal";

export async function GET() {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const year = new Date().getFullYear();
    let appraisal = await prisma.appraisal.findUnique({
      where: { doctorId_year: { doctorId: user.id, year } },
      include: { appraiser: true, sections: true },
    });
    if (!appraisal) {
      // Self-service fallback: doctors can start their own appraisal for the year.
      appraisal = await prisma.appraisal.create({
        data: {
          doctorId: user.id,
          year,
          sections: { create: DEFAULT_SECTIONS.map((sectionKey) => ({ sectionKey, data: "{}" })) },
        },
        include: { appraiser: true, sections: true },
      });
    }
    return NextResponse.json({ appraisal });
  });
}
