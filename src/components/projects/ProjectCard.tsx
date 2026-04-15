"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteProject } from "@/hooks/useProjects";
import { MoreHorizontal, Trash2, FolderOpen, CheckSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
  currentUserId: string;
}

export function ProjectCard({ project, currentUserId }: ProjectCardProps) {
  const { mutate: deleteProject, isPending } = useDeleteProject();
  const isOwner = project.ownerId === currentUserId;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">
              <Link href={`/projects/${project.id}`} className="hover:text-primary transition-colors">
                {project.name}
              </Link>
            </CardTitle>
            {project.description && (
              <CardDescription className="mt-1 line-clamp-2">{project.description}</CardDescription>
            )}
          </div>
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" />}>
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  disabled={isPending}
                  onClick={() => deleteProject(project.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckSquare className="h-3.5 w-3.5" />
              {project._count?.tasks ?? 0} tasks
            </span>
            <span>{formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}</span>
          </div>
          {!isOwner && (
            <Badge variant="secondary" className="text-xs">Collaborator</Badge>
          )}
        </div>
        <Link href={`/projects/${project.id}`} className="mt-3 flex">
          <Button variant="outline" size="sm" className="w-full">
            <FolderOpen className="mr-2 h-4 w-4" />
            Open project
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
