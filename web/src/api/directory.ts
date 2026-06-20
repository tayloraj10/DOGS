import { apiClient } from "./client";
import type {
  DirectoryEntry,
  DirectoryEntryInput,
  DirectoryEntryStatus,
  DirectoryExtractResponse,
} from "./types";

export function listDirectoryEntries(status?: DirectoryEntryStatus, limit = 50) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("limit", String(limit));
  return apiClient.get<DirectoryEntry[]>(`/directory?${params.toString()}`);
}

export function getDirectoryEntry(id: string) {
  return apiClient.get<DirectoryEntry>(`/directory/${id}`);
}

export function createDirectoryEntry(body: DirectoryEntryInput) {
  return apiClient.post<DirectoryEntry>("/directory", body);
}

export function updateDirectoryEntry(id: string, body: Partial<DirectoryEntryInput>) {
  return apiClient.patch<DirectoryEntry>(`/directory/${id}`, body);
}

export function deleteDirectoryEntry(id: string) {
  return apiClient.delete<void>(`/directory/${id}`);
}

export function extractFromUrl(url: string) {
  return apiClient.post<DirectoryExtractResponse>("/directory/extract", { url });
}
