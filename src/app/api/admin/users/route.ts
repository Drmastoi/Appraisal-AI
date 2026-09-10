import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole } from "@/lib/auth";

export async function GET() {
  return handleApi(async () => {
    await requireRole("ADMIN");
    const users = await prisma.user.findMany({
      orderBy: [{ approved: "asc" }, { createdAt: "desc" }],
      select: {
        id: true, email: true, name: true, role: true, gmcNumber: true, designatedBody: true,
        approved: true, active: true, createdAt: true,
      },
    });
    return NextResponse.json({ users });
  });
}
