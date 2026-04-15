import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export async function getCurrentUser(request: NextRequest): Promise<User | null> {
  let token = request.cookies.get("token")?.value;

  if (!token) {
    const auth = request.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) token = auth.slice(7);
  }

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.sub) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  return user;
}
