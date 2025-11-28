import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

declare global {
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}
export const connectToDatabase = async () => {
  if (!MONGODB_URI) {
    if (process.env.NODE_ENV === "production" && typeof window === "undefined") {
      // During build time (Next.js static generation), strict environment variable checks can fail
      // if not provided. We'll throw only if we actually try to connect and it's missing at runtime.
      console.warn("MONGODB_URI is not defined (checking during build?)");
    }
    throw new Error("MONGODB_URI is not defined");
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  console.log(
    `Connected to MongoDB at ${process.env.NODE_ENV} - ${MONGODB_URI}`
  );
  return cached.conn;
};
