import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { audit } from "@/lib/audit";
import { isRole } from "@/lib/roles";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2),
  role: z.string().refine((r) => r === "DOCTOR" || r === "APPRAISER", "Role must be DOCTOR or APPRAISER"),
  gmcNumber: z.string().min(5).max(20).optional(),
  designatedBody: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    if (!rateLimit(`register:${clientIp(req)}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many attempts, try again shortly" }, { status: 429 });
    }
    const body = schema.parse(await req.json());
    if (!isRole(body.role)) throw new Error("bad role");
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash: hashPassword(body.password),
        name: body.name,
        role: body.role,
        gmcNumber: body.gmcNumber ?? null,
        designatedBody: body.designatedBody ?? null,
        approved: false, // admin approval required before login
      },
    });
    await audit({
      actorId: user.id,
      actorRole: user.role,
      action: "REGISTER",
      entityType: "User",
      entityId: user.id,
      meta: { email: user.email, role: user.role },
    });
    return NextResponse.json({ ok: true, message: "Account created. An administrator must approve it before you can sign in." }, { status: 201 });
  });
}
