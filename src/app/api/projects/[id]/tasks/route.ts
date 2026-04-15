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
import { CreateTaskSchema } from "@/lib/validations/task";
import { TaskStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const [user, err] = await requireAuth(request);
  if (err) return err;

  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { tasks: { select: { assigneeId: true } } },
    });
    if (!project) return notFound();

    const hasAccess =
      project.ownerId === user.id || project.tasks.some((t) => t.assigneeId === user.id);
    if (!hasAccess) return forbidden();

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") as TaskStatus | null;
    const assigneeFilter = searchParams.get("assignee");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));

    const validStatuses = Object.values(TaskStatus);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: {
          projectId: id,
          ...(statusFilter && validStatuses.includes(statusFilter) ? { status: statusFilter } : {}),
          ...(assigneeFilter ? { assigneeId: assigneeFilter } : {}),
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({
        where: {
          projectId: id,
          ...(statusFilter && validStatuses.includes(statusFilter) ? { status: statusFilter } : {}),
          ...(assigneeFilter ? { assigneeId: assigneeFilter } : {}),
        },
      }),
    ]);

    logger.info("tasks.list", { userId: user.id, projectId: id });

    return success({
      tasks,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error("tasks.list.error", { error });
    return serverError();
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const [user, err] = await requireAuth(request);
  if (err) return err;

  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return notFound();

    // Only owner or existing assignees can create tasks
    if (project.ownerId !== user.id) {
      const assigned = await prisma.task.count({ where: { projectId: id, assigneeId: user.id } });
      if (assigned === 0) return forbidden();
    }

    const body = await request.json();
    const parsed = CreateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(zodFields(parsed.error));
    }

    const { dueDate, ...rest } = parsed.data;

    const task = await prisma.task.create({
      data: {
        ...rest,
        projectId: id,
        createdById: user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    logger.info("tasks.create", { userId: user.id, taskId: task.id, projectId: id });

    return success(task, 201);
  } catch (error) {
    logger.error("tasks.create.error", { error });
    return serverError();
  }
}
