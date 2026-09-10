import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";

export async function GET() {
  return handleApi(async () => {
    const user = await getSessionUser();
    return NextResponse.json({ user });
  });
}
