import { apiClient } from "./client";
import type {
  BackfillEditTokensResponse,
  DeleteOrphanedImagesResponse,
  OrphanedImagesResponse,
  SheetSyncResponse,
} from "./types";

export function syncFromSheet() {
  return apiClient.post<SheetSyncResponse>("/admin/sync-from-sheet", null);
}

export function backfillEditTokens() {
  return apiClient.post<BackfillEditTokensResponse>("/admin/backfill-edit-tokens", null);
}

export function listOrphanedImages() {
  return apiClient.get<OrphanedImagesResponse>("/admin/orphaned-images");
}

export function deleteOrphanedImages() {
  return apiClient.delete<DeleteOrphanedImagesResponse>("/admin/orphaned-images");
}
