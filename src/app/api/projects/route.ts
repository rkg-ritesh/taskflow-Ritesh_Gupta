import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth, success, validationError, zodFields, serverError } from "@/lib/api-helpers";
import { CreateProjectSchema } from "@/lib/validations/project";

export async function GET(request: NextRequest) {
  const [user, err] = await requireAuth(request);
  if (err) return err;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: {
          OR: [
            { ownerId: user.id },
            { tasks: { some: { assigneeId: user.id } } },
          ],
        },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.project.count({
        where: {
          OR: [
            { ownerId: user.id },
            { tasks: { some: { assigneeId: user.id } } },
          ],
        },
      }),
    ]);

    logger.info("projects.list", { userId: user.id, count: projects.length });

    return success({
      projects,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error("projects.list.error", { error });
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const [user, err] = await requireAuth(request);
  if (err) return err;

  try {
    const body = await request.json();
    const parsed = CreateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(zodFields(parsed.error));
    }

    const project = await prisma.project.create({
      data: { ...parsed.data, ownerId: user.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true } },
      },
    });

    logger.info("projects.create", { userId: user.id, projectId: project.id });

    return success(project, 201);
  } catch (error) {
    logger.error("projects.create.error", { error });
    return serverError();
  }
}
