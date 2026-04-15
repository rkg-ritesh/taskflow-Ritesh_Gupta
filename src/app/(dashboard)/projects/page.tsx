"use client";

import { useProjects } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";

function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserId(d.user?.id ?? null))
      .catch(() => null);
  }, []);
  return userId;
}

export default function ProjectsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useProjects(page);
  const currentUserId = useCurrentUserId();

  const projects = data?.projects;
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Projects you own or collaborate on
          </p>
        </div>
        <CreateProjectModal onCreated={() => setPage(1)} />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-12 text-destructive">
          Failed to load projects. Please refresh.
        </div>
      )}

      {!isLoading && !error && projects?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="p-4 rounded-full bg-muted">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first project to get started
            </p>
          </div>
          <CreateProjectModal onCreated={() => setPage(1)} />
        </div>
      )}

      {!isLoading && projects && projects.length > 0 && currentUserId && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} currentUserId={currentUserId} />
            ))}
          </div>
          {pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
