import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { nextCookies } from "better-auth/next-js";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
// Allow build to pass even if MONGODB_URI is missing, but ensure it fails at runtime if needed.
// This is to prevent "Error: MONGODB_URI is not defined" during static page generation or build steps
// where the env might not be fully populated in some environments or local builds without .env.

const client = new MongoClient(MONGODB_URI || "mongodb://localhost:27017/stockapp_fallback");
const db = client.db();

if (!MONGODB_URI && process.env.NODE_ENV === "production" && typeof window === "undefined") {
   console.warn("MONGODB_URI is missing in production build. Authentication may fail if not set at runtime.");
}

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || "fallback_secret_for_build_process_only_123456789";


const REQUIRE_EMAIL_VERIFICATION =
  process.env.REQUIRE_EMAIL_VERIFICATION !== undefined
    ? process.env.REQUIRE_EMAIL_VERIFICATION === "true"
    : process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: mongodbAdapter(db),
  secret: BETTER_AUTH_SECRET,
  baseUrl: process.env.BETTER_AUTH_URL,
  logger: {
    level: "debug",
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    requireEmailVerification: REQUIRE_EMAIL_VERIFICATION,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  plugins: [nextCookies()],
});
