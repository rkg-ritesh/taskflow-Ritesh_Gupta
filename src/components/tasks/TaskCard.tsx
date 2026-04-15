"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskModal } from "./TaskModal";
import { useDeleteTask } from "@/hooks/useTasks";
import { MoreHorizontal, Trash2, Edit, GripVertical, Calendar } from "lucide-react";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task, UserPublic } from "@/types";

const priorityConfig = {
  low: { label: "Low", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  high: { label: "High", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

interface TaskCardProps {
  task: Task;
  projectId: string;
  members: UserPublic[];
  isOwner: boolean;
}

export function TaskCard({ task, projectId, members, isOwner }: TaskCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const { mutate: deleteTask } = useDeleteTask();
  const priority = priorityConfig[task.priority];

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue =
    task.dueDate && task.status !== "done" && isPast(new Date(task.dueDate));

  const initials = task.assignee?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "group cursor-default select-none",
          isDragging && "shadow-lg ring-2 ring-primary/50"
        )}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-1.5">
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              aria-label="Drag task"
            >
              <GripVertical className="h-4 w-4" />
            </button>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-1">
                <p className="text-sm font-medium leading-tight break-words">{task.title}</p>
                {(isOwner || task.assigneeId) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />}>
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {isOwner && (
                        <DropdownMenuItem
                          className="text-destructive cursor-pointer"
                          onClick={() => deleteTask({ taskId: task.id, projectId })}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", priority.className)}>
                  {priority.label}
                </span>

                <div className="flex items-center gap-1.5">
                  {task.dueDate && (
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-xs",
                        isOverdue ? "text-destructive" : "text-muted-foreground"
                      )}
                    >
                      <Calendar className="h-3 w-3" />
                      {format(new Date(task.dueDate), "MMM d")}
                    </span>
                  )}
                  {task.assignee && (
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[9px] bg-primary/10">{initials}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <TaskModal
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={projectId}
        members={members}
        task={task}
      />
    </>
  );
}
