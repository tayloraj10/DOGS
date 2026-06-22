import { apiClient } from "./client";
import type {
  DirectoryEntry,
  DirectoryEntryEditLink,
  DirectoryEntryInput,
  DirectoryEntryStatus,
  DirectoryExtractResponse,
  StructuredLocation,
} from "./types";

export function listDirectoryEntries(status?: DirectoryEntryStatus, limit = 50) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("limit", String(limit));
  return apiClient.get<DirectoryEntry[]>(`/directory?${params.toString()}`);
}

export function listEntriesNeedingPhoto() {
  return apiClient.get<DirectoryEntry[]>("/directory?needs_photo=true&limit=500");
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

export function getDirectoryEntryEditLink(id: string) {
  return apiClient.get<DirectoryEntryEditLink>(`/directory/${id}/edit-link`);
}

export function updateDirectoryEntryPublic(
  id: string,
  token: string,
  body: Partial<DirectoryEntryInput>,
) {
  return apiClient.patch<DirectoryEntry>(
    `/directory/${id}/public?token=${encodeURIComponent(token)}`,
    body,
  );
}

export function deleteDirectoryEntry(id: string) {
  return apiClient.delete<void>(`/directory/${id}`);
}

export function extractFromUrl(url: string) {
  return apiClient.post<DirectoryExtractResponse>("/directory/extract", { url });
}

export function lookupLocation(partial: StructuredLocation) {
  return apiClient.post<StructuredLocation>("/directory/location/lookup", partial);
}
