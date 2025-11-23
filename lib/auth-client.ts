import { createAuthClient } from "better-auth/react";

const isProd = process.env.NODE_ENV === "production";
const baseURLEnv = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;

// In production, NEXT_PUBLIC_BETTER_AUTH_URL must be explicitly set.
if (isProd && !baseURLEnv) {
  throw new Error(
    "NEXT_PUBLIC_BETTER_AUTH_URL is not set. Please configure it in your environment (e.g. NEXT_PUBLIC_BETTER_AUTH_URL=https://your-domain.com)."
  );
}

export const authClient = createAuthClient({
  baseURL: baseURLEnv || "http://localhost:3000",
});

