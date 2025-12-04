import { createAuthClient } from "better-auth/react";

const isProd = process.env.NODE_ENV === "production";
const baseURLEnv = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;

// In production, warn instead of crashing, or try to infer from window location if available
if (isProd && !baseURLEnv) {
  if (typeof window !== "undefined") {
      console.warn("NEXT_PUBLIC_BETTER_AUTH_URL is not set, defaulting to window.origin");
  }
}

export const authClient = createAuthClient({
  baseURL: baseURLEnv || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"),
});

