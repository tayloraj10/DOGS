import { apiClient } from "./client";
import type { SheetSyncResponse } from "./types";

export function syncFromSheet() {
  return apiClient.post<SheetSyncResponse>("/admin/sync-from-sheet", null);
}
