import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "@/lib/auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function handleApi(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) return jsonError(err.message, err.status);
    if (err instanceof ZodError) {
      return jsonError(err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 422);
    }
    console.error("[api]", err);
    return jsonError("Internal server error", 500);
  }
}
