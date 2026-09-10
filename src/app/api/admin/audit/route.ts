import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole } from "@/lib/auth";

export async function GET(req: Request) {
  return handleApi(async () => {
    await requireRole("ADMIN");
    const url = new URL(req.url);
    const entityType = url.searchParams.get("entityType");
    const action = url.searchParams.get("action");
    const logs = await prisma.auditLog.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(action ? { action: { contains: action } } : {}),
      },
      include: { actor: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ logs });
  });
}
