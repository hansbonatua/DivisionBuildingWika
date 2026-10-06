import { Db, MongoClient } from "mongodb";

// Server-only module: imported exclusively by API routes and server code.
// Never import the MongoDB driver from Client Components.

function requiredEnv(name: "MONGODB_URI" | "MONGODB_DB_NAME"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it.`,
    );
  }
  return value;
}

declare global {
  // eslint-disable-next-line no-var
  var __wibexMongoClient: MongoClient | undefined;
}

let cachedClient: MongoClient | undefined = global.__wibexMongoClient;

export async function getMongoClient(): Promise<MongoClient> {
  if (cachedClient) {
    return cachedClient;
  }
  const client = new MongoClient(requiredEnv("MONGODB_URI"));
  await client.connect();
  // Reuse across hot reloads in development.
  cachedClient = client;
  global.__wibexMongoClient = client;
  return client;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(requiredEnv("MONGODB_DB_NAME"));
}
