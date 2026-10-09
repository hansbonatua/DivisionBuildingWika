import { defineConfig } from "drizzle-kit";

// Migration connection: prefer DIRECT_URL (direct/unpooled), fall back to
// DATABASE_URL only when DIRECT_URL is absent (e.g. simple local setups).
// Never touches MongoDB env vars.
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

// Offline commands (e.g. `generate`) only need schema/out paths, so they run
// without credentials. Live commands fail fast with a clear message instead
// of a cryptic driver error.
const isOfflineCommand = process.argv.some((arg) => ["generate", "check"].includes(arg));

if (!url && !isOfflineCommand) {
  throw new Error(
    "Missing database URL for Drizzle migrations. Set DIRECT_URL (preferred) or DATABASE_URL.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/pg/schema.ts",
  out: "./drizzle",
  ...(url ? { dbCredentials: { url } } : {}),
});
