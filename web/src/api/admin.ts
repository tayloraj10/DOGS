import { apiClient } from "./client";
import type { BackfillEditTokensResponse, SheetSyncResponse } from "./types";

export function syncFromSheet() {
  return apiClient.post<SheetSyncResponse>("/admin/sync-from-sheet", null);
}

export function backfillEditTokens() {
  return apiClient.post<BackfillEditTokensResponse>("/admin/backfill-edit-tokens", null);
}
