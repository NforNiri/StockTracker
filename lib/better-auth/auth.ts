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
// NOTE: For serverless, we must disable buffering and tune the connection.
const options = {
    maxPoolSize: 1, // Start with 1 to minimize connection overhead
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000, 
    socketTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    // Provide a fresh connection more often in lambda
    maxIdleTimeMS: 10000, 
};

// Singleton pattern for both dev and prod
if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClient = client;
    global._mongoClientPromise = client.connect();
}

// FORCE RECONNECT if topology is closed/destroyed
// Using try-catch to access internal properties safely
try {
   if (global._mongoClient) {
       // Check standard 'topology' property
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       const clientAny = global._mongoClient as any;
       const topology = clientAny.topology;
       
       let isConnected = false;
       if (topology) {
           // V4 driver check
           if (typeof topology.isConnected === 'function') {
               isConnected = topology.isConnected();
           } 
           // Fallback check (some versions use s.state)
           else if (topology.s && topology.s.state) {
               isConnected = topology.s.state === 'connected';
           }
       }

       if (!isConnected) {
            console.warn("⚠️ MongoDB client found disconnected. Force recreating...");
            // Force close old one just in case
            try { await global._mongoClient.close(); } catch {}
            
            global._mongoClient = new MongoClient(uri, options);
            global._mongoClientPromise = global._mongoClient.connect();
       }
   }
} catch (e) {
    console.error("Error checking mongo status:", e);
}

client = global._mongoClient!;
const clientPromise = global._mongoClientPromise!;

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
