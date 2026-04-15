"use client";

import { useState, use } from "react";
import { useSearchParams } from "next/navigation";
import { useProject, useProjectStats, useCurrentUser } from "@/hooks/useTasks";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { TaskModal } from "@/components/tasks/TaskModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, BarChart2, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import type { UserPublic } from "@/types";

function StatsPanel({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const { data: stats } = useProjectStats(projectId);

  if (!stats) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4" />
          Stats ({stats.total} tasks)
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">By status</p>
            <div className="flex flex-wrap gap-2">
              {stats.byStatus.map((s) => (
                <span key={s.status} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  {s.status.replace("_", " ")}: <strong>{s.count}</strong>
                </span>
              ))}
            </div>
          </div>
          {stats.byAssignee.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">By assignee</p>
              <div className="flex flex-wrap gap-2">
                {stats.byAssignee.map((a) => (
                  <span key={a.assignee?.id ?? "unassigned"} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    {a.assignee?.name ?? "Unassigned"}: <strong>{a.count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProjectDetailInner({ projectId }: { projectId: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const searchParams = useSearchParams();
  const { data: project, isLoading, error } = useProject(projectId);
  const { data: currentUser } = useCurrentUser();

  const statusFilter = searchParams.get("status");
  const assigneeFilter = searchParams.get("assignee");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-3 gap-4 mt-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-20 text-destructive">
        Project not found or you don&apos;t have access.{" "}
        <Link href="/projects" className="underline text-foreground">
          Go back
        </Link>
      </div>
    );
  }

  // Collect unique members (owner + all assignees)
  const memberMap = new Map<string, UserPublic>();
  memberMap.set(project.owner.id, project.owner);
  project.tasks.forEach((t) => {
    if (t.assignee) memberMap.set(t.assignee.id, t.assignee);
  });
  const members = Array.from(memberMap.values());

  const isOwner = !!currentUser && currentUser.id === project.ownerId;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All projects
          </Link>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {project.tasks.length} task{project.tasks.length !== 1 ? "s" : ""}
            </Badge>
            <span className="text-xs text-muted-foreground">
              by {project.owner.name}
            </span>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add task
        </Button>
      </div>

      <StatsPanel projectId={projectId} />

      <Separator />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-medium">Board</p>
        <TaskFilters members={members} />
      </div>

      <TaskBoard
        tasks={project.tasks}
        projectId={projectId}
        members={members}
        isOwner={isOwner}
        statusFilter={statusFilter}
        assigneeFilter={assigneeFilter}
      />

      <TaskModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        members={members}
      />
    </div>
  );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-64" /></div>}>
      <ProjectDetailInner projectId={id} />
    </Suspense>
  );
}
