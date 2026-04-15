import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export async function getCurrentUser(request: NextRequest): Promise<User | null> {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.sub) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  return user;
}
