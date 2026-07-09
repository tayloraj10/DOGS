import { apiClient } from "./client";
import type { UserProfile, UserProfileUpdate } from "./types";

export function getMyProfile() {
  return apiClient.get<UserProfile>("/users/me");
}

export function updateMyProfile(body: UserProfileUpdate) {
  return apiClient.patch<UserProfile>("/users/me", body);
}
