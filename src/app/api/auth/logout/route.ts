import { NextResponse } from "next/server";
import { destroySession, getSessionUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function POST() {
  return handleApi(async () => {
    const user = await getSessionUser();
    await destroySession();
    if (user) await audit({ actorId: user.id, actorRole: user.role, action: "LOGOUT", entityType: "User", entityId: user.id });
    return NextResponse.json({ ok: true });
  });
}
