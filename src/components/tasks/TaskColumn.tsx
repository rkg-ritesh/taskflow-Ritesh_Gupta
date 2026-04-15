"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus, UserPublic } from "@/types";

const statusConfig: Record<TaskStatus, { label: string; headerClass: string }> = {
  todo: { label: "To Do", headerClass: "border-t-slate-400" },
  in_progress: { label: "In Progress", headerClass: "border-t-blue-500" },
  done: { label: "Done", headerClass: "border-t-green-500" },
};

interface TaskColumnProps {
  status: TaskStatus;
  tasks: Task[];
  projectId: string;
  members: UserPublic[];
  isOwner: boolean;
}

export function TaskColumn({ status, tasks, projectId, members, isOwner }: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = statusConfig[status];

  return (
    <div className="flex flex-col min-h-0">
      <div className={cn("bg-card border rounded-lg border-t-4 flex flex-col", config.headerClass)}>
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">{config.label}</span>
          <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
        </div>

        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 p-2 space-y-2 min-h-[200px] rounded-b-lg transition-colors",
            isOver && "bg-muted/50"
          )}
        >
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                projectId={projectId}
                members={members}
                isOwner={isOwner}
              />
            ))}
          </SortableContext>

          {tasks.length === 0 && (
            <div className="flex items-center justify-center h-24 text-xs text-muted-foreground border border-dashed rounded-md">
              Drop tasks here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
