import { initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Sign-in is optional everywhere in this app, so a missing/invalid Firebase
// config must never break the signed-out experience. Only initialize the SDK
// when the required config values are actually present; otherwise `auth`
// stays null and callers fall back to unauthenticated behavior.
export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.appId);

let auth: Auth | null = null;

if (firebaseEnabled) {
  const firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
} else {
  console.warn(
    "Firebase config is missing (VITE_FIREBASE_* env vars) — sign-in is disabled, app runs signed-out only.",
  );
}

export { auth };
