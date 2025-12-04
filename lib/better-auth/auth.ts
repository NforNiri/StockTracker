import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { nextCookies } from "better-auth/next-js";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

// Global declaration for TypeScript to recognize the cache
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _mongoClient: MongoClient | undefined;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Debug logging
if (process.env.NODE_ENV === "production") {
    if (!MONGODB_URI) {
        console.error("⚠️ CRITICAL: MONGODB_URI is not defined in production environment variables!");
    } else {
        const maskedUri = MONGODB_URI.replace(/:([^:@]+)@/, ":****@");
        console.log(`✅ Authentication initializing with URI: ${maskedUri}`);
        if (MONGODB_URI.includes("localhost") || MONGODB_URI.includes("127.0.0.1")) {
             console.warn("⚠️ WARNING: MONGODB_URI points to localhost in production. This will likely fail.");
        }
    }
}

if (!MONGODB_URI) {
  // Allow build to pass even if MONGODB_URI is missing (using fallback), 
  // but ensure it fails or warns at runtime if needed.
  if (process.env.NODE_ENV === "production" && typeof window === "undefined") {
     // We don't throw here to avoid breaking static generation, but we log heavily above.
  }
}

const uri = MONGODB_URI || "mongodb://localhost:27017/stockapp_fallback";
const options = {
    // In serverless environments, it's important to limit the pool size
    // to prevent exhausting database connection limits.
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000, // Wait up to 10s for connection
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    connectTimeoutMS: 10000,
};

// Singleton pattern for both dev and prod to handle hot reload and serverless container reuse
if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClient = client;
    global._mongoClientPromise = client.connect();
}

// Check if client is closed and reconnect if needed (experimental)
if (global._mongoClient && global._mongoClient.topology && (global._mongoClient.topology as any).isDestroyed?.()) {
    console.warn("⚠️ MongoDB client topology was destroyed. Recreating client...");
    global._mongoClient = new MongoClient(uri, options);
    global._mongoClientPromise = global._mongoClient.connect();
}

client = global._mongoClient!;
clientPromise = global._mongoClientPromise!;

// Add error handler to connection promise
clientPromise.catch(err => {
    console.error("MongoDB Connection Error in auth.ts:", err);
    // Reset the client promise so we can try again on next request
    global._mongoClientPromise = undefined;
    global._mongoClient = undefined;
});

// better-auth mongodbAdapter expects a Db instance.
// We can pass the db from the client.
// Note: client.db() is synchronous and doesn't require waiting for connect(),
// but operations will wait.
const db = client.db();

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || "fallback_secret_for_build_process_only_123456789";


const REQUIRE_EMAIL_VERIFICATION =
  process.env.REQUIRE_EMAIL_VERIFICATION === "true"; 
  // Defaults to false to avoid blocking sign-ins if email provider isn't set up.
  // Was: process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: mongodbAdapter(db),
  secret: BETTER_AUTH_SECRET,
  baseUrl: process.env.BETTER_AUTH_URL,
  logger: {
    level: "debug", // Keep debug logging enabled for now
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
