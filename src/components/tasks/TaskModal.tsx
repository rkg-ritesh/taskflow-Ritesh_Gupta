"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateTask, useUpdateTask, useUsers } from "@/hooks/useTasks";
import { CreateTaskSchema, type CreateTaskInput } from "@/lib/validations/task";
import type { Task, UserPublic } from "@/types";

const PRIORITY_CONFIG = {
  low:    { label: "Low",    dot: "bg-blue-400" },
  medium: { label: "Medium", dot: "bg-amber-400" },
  high:   { label: "High",   dot: "bg-red-500" },
} as const;

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  members: UserPublic[];
  task?: Task;
}

export function TaskModal({ open, onOpenChange, projectId, members, task }: TaskModalProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: allUsers } = useUsers();
  const assignees = allUsers ?? members;
  const isEditing = !!task;
  const isPending = createTask.isPending || updateTask.isPending;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(CreateTaskSchema),
    defaultValues: task
      ? {
          title: task.title,
          description: task.description ?? undefined,
          priority: task.priority,
          assigneeId: task.assigneeId,
          dueDate: task.dueDate ?? undefined,
        }
      : { priority: "medium" },
  });

  useEffect(() => {
    if (open) {
      reset(
        task
          ? {
              title: task.title,
              description: task.description ?? undefined,
              priority: task.priority,
              assigneeId: task.assigneeId,
              dueDate: task.dueDate ?? undefined,
            }
          : { priority: "medium" }
      );
    }
  }, [open, task, reset]);

  async function onSubmit(data: CreateTaskInput) {
    if (isEditing && task) {
      await updateTask.mutateAsync({ taskId: task.id, projectId, data });
    } else {
      await createTask.mutateAsync({ projectId, data });
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle>{isEditing ? "Edit task" : "New task"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update task details below." : "Fill in the details to add a task to this project."}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="What needs to be done?"
                {...register("title")}
                aria-invalid={!!errors.title}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">
                Description{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <textarea
                id="description"
                placeholder="Add more details..."
                rows={3}
                className={cn(
                  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none",
                  "placeholder:text-muted-foreground resize-none",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  "disabled:pointer-events-none disabled:opacity-50"
                )}
                {...register("description")}
              />
            </div>

            {/* Priority + Assignee */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Controller
                  control={control}
                  name="priority"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(PRIORITY_CONFIG) as [keyof typeof PRIORITY_CONFIG, typeof PRIORITY_CONFIG[keyof typeof PRIORITY_CONFIG]][]).map(
                          ([value, { label, dot }]) => (
                            <SelectItem key={value} value={value}>
                              <span className="flex items-center gap-2">
                                <span className={cn("h-2 w-2 rounded-full", dot)} />
                                {label}
                              </span>
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Assignee</Label>
                <Controller
                  control={control}
                  name="assigneeId"
                  render={({ field }) => (
                    <Select
                      onValueChange={(v) => field.onChange(v === "unassigned" ? null : v)}
                      value={field.value ?? "unassigned"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to...">
                          {field.value && field.value !== "unassigned"
                            ? (assignees.find((m) => m.id === field.value)?.name ?? "Assign to...")
                            : field.value === "unassigned"
                            ? "Unassigned"
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {assignees.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Due date */}
            <div className="space-y-1.5">
              <Label>
                Due date{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Controller
                control={control}
                name="dueDate"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        />
                      }
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(new Date(field.value), "PPP") : "Pick a date"}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) =>
                          field.onChange(date ? format(date, "yyyy-MM-dd") : null)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>
          </div>

          <Separator />

          <SheetFooter className="px-6 py-4 flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isPending}>
              {(isSubmitting || isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? "Save changes" : "Create task"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
