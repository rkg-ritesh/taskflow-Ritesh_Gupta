import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireAuth, success, forbidden, notFound, serverError } from "@/lib/api-helpers";

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

    const [byStatus, byAssignee] = await Promise.all([
      prisma.task.groupBy({
        by: ["status"],
        where: { projectId: id },
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ["assigneeId"],
        where: { projectId: id, assigneeId: { not: null } },
        _count: { _all: true },
      }),
    ]);

    // Enrich assignee data
    const assigneeIds = byAssignee.map((a) => a.assigneeId).filter(Boolean) as string[];
    const assignees = await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, name: true, email: true },
    });
    const assigneeMap = Object.fromEntries(assignees.map((a) => [a.id, a]));

    const stats = {
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      byAssignee: byAssignee.map((a) => ({
        assignee: a.assigneeId ? assigneeMap[a.assigneeId] : null,
        count: a._count._all,
      })),
      total: byStatus.reduce((sum, s) => sum + s._count._all, 0),
    };

    logger.info("projects.stats", { userId: user.id, projectId: id });

    return success(stats);
  } catch (error) {
    logger.error("projects.stats.error", { error });
    return serverError();
  }
}
