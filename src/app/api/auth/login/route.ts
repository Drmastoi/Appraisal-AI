import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, setRoleCookie, verifyPassword } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { audit } from "@/lib/audit";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  return handleApi(async () => {
    const ip = clientIp(req);
    if (!rateLimit(`login:${ip}`, 15, 60_000)) {
      return NextResponse.json({ error: "Too many attempts, try again shortly" }, { status: 429 });
    }
    const body = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    if (!user.approved) {
      return NextResponse.json({ error: "Your account is awaiting administrator approval" }, { status: 403 });
    }
    if (!user.active) {
      return NextResponse.json({ error: "This account has been deactivated" }, { status: 403 });
    }
    await createSession(user.id, req.headers.get("user-agent") ?? undefined);
    await setRoleCookie(user.role);
    await audit({ actorId: user.id, actorRole: user.role, action: "LOGIN", entityType: "User", entityId: user.id });
    return NextResponse.json({ ok: true, role: user.role, name: user.name });
  });
}
