import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireUser, ApiError } from "@/lib/auth";
import { approveAIInteraction } from "@/lib/ai/service";

export async function POST(_req: Request, { params }: { params: Promise<{ interactionId: string }> }) {
  return handleApi(async () => {
    const user = await requireUser();
    const { interactionId } = await params;
    const interaction = await prisma.aIInteraction.findUnique({ where: { id: interactionId } });
    if (!interaction) throw new ApiError(404, "AI interaction not found");
    if (interaction.userId !== user.id && user.role !== "ADMIN") throw new ApiError(403, "Only the author or an admin can approve this draft");
    await approveAIInteraction(user.id, user.role, interactionId);
    return NextResponse.json({ ok: true });
  });
}
