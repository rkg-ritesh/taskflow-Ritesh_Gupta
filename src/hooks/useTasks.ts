import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Task, TaskStatus, ProjectDetail, Stats, UserPublic } from "@/types";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Request failed");
  }
  return res.json();
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: () => apiFetch<{ user: UserPublic }>("/api/auth/me").then((r) => r.user),
    staleTime: Infinity,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<{ users: UserPublic[] }>("/api/users").then((r) => r.users),
    staleTime: 60_000,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => apiFetch<ProjectDetail>(`/api/projects/${projectId}`),
  });
}

export function useProjectStats(projectId: string) {
  return useQuery({
    queryKey: ["project-stats", projectId],
    queryFn: () => apiFetch<Stats>(`/api/projects/${projectId}/stats`),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: {
        title: string;
        description?: string;
        priority?: string;
        assigneeId?: string | null;
        dueDate?: string | null;
      };
    }) =>
      apiFetch<Task>(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: ["project", task.projectId] });
      qc.invalidateQueries({ queryKey: ["project-stats", task.projectId] });
      toast.success("Task created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus; projectId: string }) =>
      apiFetch<Task>(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onMutate: async ({ taskId, status, projectId }) => {
      await qc.cancelQueries({ queryKey: ["project", projectId] });
      const previous = qc.getQueryData<ProjectDetail>(["project", projectId]);

      qc.setQueryData<ProjectDetail>(["project", projectId], (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
        };
      });

      return { previous, projectId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(["project", ctx.projectId], ctx.previous);
      }
      toast.error("Failed to update task status");
    },
    onSettled: (_data, _err, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["project-stats", projectId] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string;
      projectId: string;
      data: Partial<{
        title: string;
        description: string | null;
        status: TaskStatus;
        priority: string;
        assigneeId: string | null;
        dueDate: string | null;
      }>;
    }) =>
      apiFetch<Task>(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: ["project", task.projectId] });
      qc.invalidateQueries({ queryKey: ["project-stats", task.projectId] });
      toast.success("Task updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId }: { taskId: string; projectId: string }) =>
      fetch(`/api/tasks/${taskId}`, { method: "DELETE" }),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["project-stats", projectId] });
      toast.success("Task deleted");
    },
    onError: () => toast.error("Failed to delete task"),
  });
}
