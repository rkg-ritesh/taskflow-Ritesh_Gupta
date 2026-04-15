import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  requireAuth,
  success,
  validationError,
  zodFields,
  forbidden,
  notFound,
  serverError,
} from "@/lib/api-helpers";
import { UpdateProjectSchema } from "@/lib/validations/project";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const [user, err] = await requireAuth(request);
  if (err) return err;

  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) return notFound();

    const hasAccess =
      project.ownerId === user.id ||
      project.tasks.some((t) => t.assigneeId === user.id);

    if (!hasAccess) return forbidden();

    logger.info("projects.get", { userId: user.id, projectId: id });

    return success(project);
  } catch (error) {
    logger.error("projects.get.error", { error });
    return serverError();
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const [user, err] = await requireAuth(request);
  if (err) return err;

  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return notFound();
    if (project.ownerId !== user.id) return forbidden();

    const body = await request.json();
    const parsed = UpdateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(zodFields(parsed.error));
    }

    const updated = await prisma.project.update({
      where: { id },
      data: parsed.data,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true } },
      },
    });

    logger.info("projects.update", { userId: user.id, projectId: id });

    return success(updated);
  } catch (error) {
    logger.error("projects.update.error", { error });
    return serverError();
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const [user, err] = await requireAuth(request);
  if (err) return err;

  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return notFound();
    if (project.ownerId !== user.id) return forbidden();

    await prisma.project.delete({ where: { id } });

    logger.info("projects.delete", { userId: user.id, projectId: id });

    return new Response(null, { status: 204 });
  } catch (error) {
    logger.error("projects.delete.error", { error });
    return serverError();
  }
}
