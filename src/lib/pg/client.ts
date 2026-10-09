import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/pg/schema";

// Server-only module: import exclusively from API routes / server code.
// Never import from Client Components. Mirrors the spirit of the existing
// MongoDB connection caching (global singleton across hot reloads).
//
// Lazily created: importing this module never opens a connection, so
// `next build` succeeds with DATABASE_URL absent.

declare global {
  // eslint-disable-next-line no-var
  var __wibexPgClient: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __wibexPgDb: PgDatabase | undefined;
}

export type PgDatabase = PostgresJsDatabase<typeof schema>;

function requiredDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error(
      "Missing environment variable DATABASE_URL. Copy .env.example to .env.local and fill it.",
    );
  }
  return value;
}

function getPostgresClient(): ReturnType<typeof postgres> {
  if (!global.__wibexPgClient) {
    // prepare: false keeps the client compatible with pooled (PgBouncer-style)
    // serverless connections used for the Vercel prototype runtime.
    global.__wibexPgClient = postgres(requiredDatabaseUrl(), { prepare: false });
  }
  return global.__wibexPgClient;
}

// Repository entry point for later phases: getPgDb().select()... etc.
export function getPgDb(): PgDatabase {
  if (!global.__wibexPgDb) {
    global.__wibexPgDb = drizzle(getPostgresClient(), { schema });
  }
  return global.__wibexPgDb;
}
