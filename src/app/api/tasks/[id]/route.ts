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
import { UpdateTaskSchema } from "@/lib/validations/task";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const [user, err] = await requireAuth(request);
  if (err) return err;

  try {
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) return notFound();

    const isOwner = task.project.ownerId === user.id;
    const isAssignee = task.assigneeId === user.id;

    if (!isOwner && !isAssignee) return forbidden();

    const body = await request.json();
    const parsed = UpdateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(zodFields(parsed.error));
    }

    const { dueDate, ...rest } = parsed.data;

    // Assignees can only update status; owners can update everything
    const updateData = isOwner
      ? {
          ...rest,
          ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        }
      : { status: rest.status };

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    logger.info("tasks.update", { userId: user.id, taskId: id });

    return success(updated);
  } catch (error) {
    logger.error("tasks.update.error", { error });
    return serverError();
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const [user, err] = await requireAuth(request);
  if (err) return err;

  try {
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) return notFound();
    const isOwner = task.project.ownerId === user.id;
    const isCreator = task.createdById === user.id;
    if (!isOwner && !isCreator) return forbidden();

    await prisma.task.delete({ where: { id } });

    logger.info("tasks.delete", { userId: user.id, taskId: id });

    return new Response(null, { status: 204 });
  } catch (error) {
    logger.error("tasks.delete.error", { error });
    return serverError();
  }
}
