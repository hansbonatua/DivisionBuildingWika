import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { getPgDb } from "@/lib/pg/client";
import { users } from "@/lib/pg/schema";

// First-admin seed: NIP + password credential.
// Usage (credentials never committed, never printed):
//   node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/seed-admin.ts
// Required env: ADMIN_NIP, ADMIN_PASSWORD, ADMIN_EMAIL (users.email is NOT NULL).
// Optional env: ADMIN_NAME (default "Administrator"), ADMIN_POSITION (default "Staff").

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Refusing to seed admin.`);
  }
  return value;
}

async function main(): Promise<void> {
  const nip = requiredEnv("ADMIN_NIP");
  const password = requiredEnv("ADMIN_PASSWORD");
  const email = requiredEnv("ADMIN_EMAIL");
  const name = process.env.ADMIN_NAME?.trim() || "Administrator";
  const position = process.env.ADMIN_POSITION?.trim() || "Staff";

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters. Refusing to seed admin.");
  }

  const db = getPgDb();
  const existing = await db.select().from(users).where(eq(users.nip, nip)).limit(1);
  const passwordHash = await hashPassword(password);

  if (existing[0]) {
    await db
      .update(users)
      .set({
        name,
        email,
        passwordHash,
        position,
        role: "Admin",
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(users.nip, nip));
    console.log(`Admin upserted (updated) for NIP ending ...${nip.slice(-4)}`);
  } else {
    await db.insert(users).values({
      name,
      email,
      passwordHash,
      nip,
      position,
      role: "Admin",
      status: "active",
    });
    console.log(`Admin upserted (created) for NIP ending ...${nip.slice(-4)}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
