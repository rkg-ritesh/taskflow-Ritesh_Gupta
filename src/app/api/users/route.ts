import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth, success, serverError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const [user, err] = await requireAuth(request);
  if (err) return err;

  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { name: "asc" },
    });

    logger.info("users.list", { userId: user.id });

    return success({ users });
  } catch (error) {
    logger.error("users.list.error", { error });
    return serverError();
  }
}
