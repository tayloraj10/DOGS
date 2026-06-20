import { apiClient } from "./client";
import type { Category } from "./types";

export function listCategories() {
  return apiClient.get<Category[]>("/categories");
}
