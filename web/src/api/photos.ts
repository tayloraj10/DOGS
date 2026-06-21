import { apiClient } from "./client";
import type { DirectoryPhotoUploadResponse } from "./types";

export function uploadDirectoryPhoto(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.postForm<DirectoryPhotoUploadResponse>("/directory/photos", formData);
}

export function uploadDirectoryPhotoFromUrl(url: string) {
  return apiClient.post<DirectoryPhotoUploadResponse>("/directory/photos/from-url", { url });
}
