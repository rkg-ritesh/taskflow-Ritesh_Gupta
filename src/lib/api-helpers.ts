import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@prisma/client";

export function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  error.issues.forEach((issue) => {
    const key = String(issue.path[0] ?? "root");
    fields[key] = issue.message;
  });
  return fields;
}

export function success<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function validationError(fields: Record<string, string>): NextResponse {
  return NextResponse.json({ error: "validation failed", fields }, { status: 400 });
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export function notFound(): NextResponse {
  return NextResponse.json({ error: "not found" }, { status: 404 });
}

export function serverError(): NextResponse {
  return NextResponse.json({ error: "internal server error" }, { status: 500 });
}

export async function requireAuth(
  request: NextRequest
): Promise<[User, null] | [null, NextResponse]> {
  const user = await getCurrentUser(request);
  if (!user) return [null, unauthorized()];
  return [user, null];
}
