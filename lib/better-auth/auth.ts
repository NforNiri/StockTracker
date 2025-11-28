import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { nextCookies } from "better-auth/next-js";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

// Global declaration for TypeScript to recognize the cache
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!MONGODB_URI) {
  // Allow build to pass even if MONGODB_URI is missing (using fallback), 
  // but ensure it fails or warns at runtime if needed.
  if (process.env.NODE_ENV === "production" && typeof window === "undefined") {
    console.warn("MONGODB_URI is missing in production build. Authentication will fail if not set at runtime.");
  }
}

const uri = MONGODB_URI || "mongodb://localhost:27017/stockapp_fallback";

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

// better-auth mongodbAdapter expects a Db instance.
// We can pass the db from the client.
// Note: client.db() is synchronous and doesn't require waiting for connect(),
// but operations will wait.
const db = client.db();

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
