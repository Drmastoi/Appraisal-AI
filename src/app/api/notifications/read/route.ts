import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export async function POST() {
  return handleApi(async () => {
    const user = await requireUser();
    await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    return NextResponse.json({ ok: true });
  });
}
