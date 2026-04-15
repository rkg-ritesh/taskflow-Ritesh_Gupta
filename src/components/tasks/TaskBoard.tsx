"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { TaskColumn } from "./TaskColumn";
import { TaskCard } from "./TaskCard";
import { useUpdateTaskStatus } from "@/hooks/useTasks";
import type { Task, TaskStatus, UserPublic } from "@/types";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

interface TaskBoardProps {
  tasks: Task[];
  projectId: string;
  members: UserPublic[];
  isOwner: boolean;
  statusFilter?: string | null;
  assigneeFilter?: string | null;
}

export function TaskBoard({
  tasks,
  projectId,
  members,
  isOwner,
  statusFilter,
  assigneeFilter,
}: TaskBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const updateStatus = useUpdateTaskStatus();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter && statusFilter !== "all" && t.status !== statusFilter) return false;
    if (assigneeFilter && assigneeFilter !== "all" && t.assigneeId !== assigneeFilter) return false;
    return true;
  });

  function getTasksByStatus(status: TaskStatus) {
    return filteredTasks.filter((t) => t.status === status);
  }

  function onDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) setActiveTask(task);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const task = active.data.current?.task as Task | undefined;
    if (!task) return;

    // over.id can be a status column id or a task id
    let newStatus = over.id as TaskStatus;

    // If dropped on a task, get that task's status
    if (!STATUSES.includes(newStatus)) {
      const overTask = tasks.find((t) => t.id === over.id);
      if (!overTask) return;
      newStatus = overTask.status;
    }

    if (task.status !== newStatus) {
      updateStatus.mutate({ taskId: task.id, status: newStatus, projectId });
    }
  }

  function onDragOver(event: DragOverEvent) {
    // Allow dragging over task cards within same or different columns
    void event;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUSES.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            tasks={getTasksByStatus(status)}
            projectId={projectId}
            members={members}
            isOwner={isOwner}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <TaskCard
            task={activeTask}
            projectId={projectId}
            members={members}
            isOwner={isOwner}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
