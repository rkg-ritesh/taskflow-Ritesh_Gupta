import { z } from "zod";
import { TaskPriority, TaskStatus } from "@prisma/client";

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  description: z.string().max(2000).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
