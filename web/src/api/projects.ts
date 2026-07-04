import { apiClient } from "./client";
import type {
  DirectoryEntryStatus,
  DirectoryExtractResponse,
  Project,
  ProjectInput,
} from "./types";

export interface ProjectEditLink {
  token: string;
}

export function listProjects(status?: DirectoryEntryStatus, limit = 50) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("limit", String(limit));
  return apiClient.get<Project[]>(`/projects?${params.toString()}`);
}

export function listProjectsNeedingPhoto() {
  return apiClient.get<Project[]>("/projects?needs_photo=true&limit=500");
}

export function getProject(id: string) {
  return apiClient.get<Project>(`/projects/${id}`);
}

export function createProject(body: ProjectInput) {
  return apiClient.post<Project>("/projects", body);
}

export function updateProject(id: string, body: Partial<ProjectInput>) {
  return apiClient.patch<Project>(`/projects/${id}`, body);
}

export function getProjectEditLink(id: string) {
  return apiClient.get<ProjectEditLink>(`/projects/${id}/edit-link`);
}

export function updateProjectPublic(
  id: string,
  token: string,
  body: Partial<ProjectInput>,
) {
  return apiClient.patch<Project>(
    `/projects/${id}/public?token=${encodeURIComponent(token)}`,
    body,
  );
}

export function deleteProject(id: string) {
  return apiClient.delete<void>(`/projects/${id}`);
}

export function approveSuggestedProjectCategory(id: string) {
  return apiClient.post<Project>(`/projects/${id}/approve-suggested-category`, {});
}

export function extractProjectFromUrl(url: string) {
  return apiClient.post<DirectoryExtractResponse>("/projects/extract", { url });
}
