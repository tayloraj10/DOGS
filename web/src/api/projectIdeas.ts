import { apiClient } from "./client";
import type {
  IdeaInterestInput,
  Project,
  ProjectIdea,
  ProjectIdeaEditLink,
  ProjectIdeaInput,
  ProjectIdeaStatus,
  SimilarApp,
  SimilarAppInput,
  SimilarMatch,
} from "./types";

export function searchSimilarIdeas(name: string, description: string, excludeIdeaId?: string) {
  const params = new URLSearchParams();
  params.set("name", name);
  params.set("description", description);
  if (excludeIdeaId) params.set("exclude_idea_id", excludeIdeaId);
  return apiClient.get<SimilarMatch[]>(`/project-ideas/similar?${params.toString()}`);
}

export function listIdeas(status?: ProjectIdeaStatus, limit = 50) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("limit", String(limit));
  return apiClient.get<ProjectIdea[]>(`/project-ideas?${params.toString()}`);
}

export function getIdea(id: string) {
  return apiClient.get<ProjectIdea>(`/project-ideas/${id}`);
}

export function createIdea(body: ProjectIdeaInput) {
  return apiClient.post<ProjectIdea>("/project-ideas", body);
}

export function updateIdea(id: string, body: Partial<ProjectIdeaInput> & { status?: ProjectIdeaStatus }) {
  return apiClient.patch<ProjectIdea>(`/project-ideas/${id}`, body);
}

export function getIdeaEditLink(id: string) {
  return apiClient.get<ProjectIdeaEditLink>(`/project-ideas/${id}/edit-link`);
}

export function updateIdeaPublic(id: string, token: string, body: Partial<ProjectIdeaInput>) {
  return apiClient.patch<ProjectIdea>(
    `/project-ideas/${id}/public?token=${encodeURIComponent(token)}`,
    body,
  );
}

export function updateIdeaMine(id: string, body: Partial<ProjectIdeaInput>) {
  return apiClient.patch<ProjectIdea>(`/project-ideas/${id}/mine`, body);
}

export function addSimilarApp(ideaId: string, body: SimilarAppInput) {
  return apiClient.post<SimilarApp>(`/project-ideas/${ideaId}/similar-apps`, body);
}

export function deleteSimilarApp(ideaId: string, appId: string) {
  return apiClient.delete<void>(`/project-ideas/${ideaId}/similar-apps/${appId}`);
}

export function approveIdea(id: string) {
  return apiClient.post<ProjectIdea>(`/project-ideas/${id}/approve`, {});
}

export function expressInterest(id: string, body: IdeaInterestInput) {
  return apiClient.post<ProjectIdea>(`/project-ideas/${id}/interest`, body);
}

export function withdrawInterest(id: string) {
  return apiClient.delete<ProjectIdea>(`/project-ideas/${id}/interest`);
}

export function convertIdea(id: string) {
  return apiClient.post<Project>(`/project-ideas/${id}/convert`, {});
}

export function rejectIdea(id: string) {
  return apiClient.post<ProjectIdea>(`/project-ideas/${id}/reject`, {});
}

export function mergeIdea(id: string, projectId: string) {
  return apiClient.post<ProjectIdea>(
    `/project-ideas/${id}/merge?project_id=${encodeURIComponent(projectId)}`,
    {},
  );
}
