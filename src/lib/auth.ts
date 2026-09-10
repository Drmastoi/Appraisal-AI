import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, ROLE_COOKIE, SESSION_TTL_DAYS, hashToken, generateToken } from "@/lib/auth-core";
import type { Role } from "@/lib/roles";

export { SESSION_COOKIE, ROLE_COOKIE, hashPassword, verifyPassword, generateToken, hashToken, safeEqual } from "@/lib/auth-core";

export async function createSession(userId: string, userAgent?: string) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { id: hashToken(token), userId, expiresAt, userAgent: userAgent ?? null },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function setRoleCookie(role: string) {
  const store = await cookies();
  store.set(ROLE_COOKIE, role, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { id: hashToken(token) } });
  }
  store.delete(SESSION_COOKIE);
  store.delete(ROLE_COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  gmcNumber: string | null;
  designatedBody: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date() || !session.user.active || !session.user.approved) {
    // Hygiene: remove expired sessions so they don't accumulate.
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as Role,
    gmcNumber: session.user.gmcNumber,
    designatedBody: session.user.designatedBody,
  };
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Not authenticated");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new ApiError(403, "Forbidden for role " + user.role);
  return user;
}
