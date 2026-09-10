import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireUser, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    const url = new URL(new Request("http://local").url); // placeholder to keep typing simple
    void url;

    const targetId = user.role === "ADMIN" ? null : user.id;

    const data: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      account: { email: user.email, name: user.name, role: user.role, gmcNumber: user.gmcNumber, designatedBody: user.designatedBody },
    };

    if (user.role === "DOCTOR" || targetId) {
      const doctorId = targetId ?? user.id;
      const appraisals = await prisma.appraisal.findMany({
        where: { doctorId },
        include: {
          appraiser: { select: { name: true, email: true } },
          sections: true,
          cpdEntries: true,
          qiEntries: true,
          significantEvents: true,
          pdpObjectives: { include: { previousObjective: { select: { title: true } } } },
          feedbackCycles: { include: { responses: true } },
          comments: { include: { author: { select: { name: true } } } },
          signatures: true,
          aiInteractions: true,
        },
        orderBy: { year: "asc" },
      });
      data.appraisals = appraisals;
      data.note = "Attachment file contents are excluded from this export; downloads remain available in the portal.";
    }

    if (user.role === "APPRAISER") {
      const appraisals = await prisma.appraisal.findMany({
        where: { appraiserId: user.id },
        include: { doctor: { select: { name: true, gmcNumber: true } }, sections: true, signatures: true, comments: { where: { authorId: user.id } } },
        orderBy: { year: "asc" },
      });
      data.appraisalsAsAppraiser = appraisals;
    }

    if (user.role === "ADMIN") {
      throw new ApiError(400, "Admins export per-doctor data from the compliance page; this endpoint exports your own record only.");
    }

    await audit({ actorId: user.id, actorRole: user.role, action: "ACCOUNT_DATA_EXPORT", entityType: "User", entityId: user.id });
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="my-appraisal-data-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  });
}
