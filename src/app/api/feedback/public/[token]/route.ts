import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { ApiError } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const schema = z.object({
  ratings: z.record(z.string(), z.number().int().min(1).max(5)),
  freeText: z.record(z.string(), z.string().max(3000)).optional(),
  relationship: z.string().max(200).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  return handleApi(async () => {
    if (!rateLimit(`fb:${clientIp(req)}`, 30, 60_000)) {
      return NextResponse.json({ error: "Too many submissions, try again later" }, { status: 429 });
    }
    const { token } = await params;
    const body = schema.parse(await req.json());
    const invite = await prisma.feedbackInvite.findUnique({ where: { token }, include: { cycle: true } });
    if (!invite) throw new ApiError(404, "Feedback link not found");
    if (invite.completed) throw new ApiError(409, "This feedback link has already been used");
    if (invite.cycle.status !== "OPEN") throw new ApiError(409, "This feedback cycle is closed");

    await prisma.feedbackResponse.create({
      data: {
        cycleId: invite.cycleId,
        inviteId: invite.id,
        ratings: JSON.stringify(body.ratings),
        freeText: JSON.stringify(body.freeText ?? {}),
      },
    });
    await prisma.feedbackInvite.update({ where: { id: invite.id }, data: { completed: true, completedAt: new Date() } });
    return NextResponse.json({ ok: true }, { status: 201 });
  });
}
