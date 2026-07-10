import { apiClient } from "./client";
import type { ProjectMember, ProjectMemberJoinInput, ProjectMemberUpdateInput } from "./types";

export function listProjectMembers(projectId: string) {
  return apiClient.get<ProjectMember[]>(`/projects/${projectId}/members`);
}

export function joinProject(projectId: string, body: ProjectMemberJoinInput = {}) {
  return apiClient.post<ProjectMember>(`/projects/${projectId}/join`, body);
}

export function leaveProject(projectId: string) {
  return apiClient.delete<void>(`/projects/${projectId}/leave`);
}

export function updateOwnMembership(projectId: string, body: ProjectMemberUpdateInput) {
  return apiClient.patch<ProjectMember>(`/projects/${projectId}/members/me`, body);
}
