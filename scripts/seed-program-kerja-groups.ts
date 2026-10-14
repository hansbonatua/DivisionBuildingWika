import { getPgDb } from "@/lib/pg/client";
import { programKerjaGroups } from "@/lib/pg/schema";

// Initial Program Kerja functional groups (reference data).
// Usage (same runner pattern as seed-admin; no secrets involved):
//   node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/seed-program-kerja-groups.ts
// Idempotent: existing names are skipped via ON CONFLICT DO NOTHING, so
// re-running never creates duplicates. No dummy Program Kerja rows here.
const GROUPS: Array<{ name: string; sortOrder: number }> = [
  { name: "Structure, Architecture, Green Building Analysis", sortOrder: 1 },
  { name: "System Engineering & Digitalization", sortOrder: 2 },
  { name: "MEP Analysis", sortOrder: 3 },
];

async function main(): Promise<void> {
  const db = getPgDb();
  for (const group of GROUPS) {
    await db
      .insert(programKerjaGroups)
      .values({ name: group.name, sortOrder: group.sortOrder })
      .onConflictDoNothing({ target: programKerjaGroups.name });
  }
  const rows = await db.select().from(programKerjaGroups);
  console.log(`program_kerja_groups rows: ${rows.length}`);
  // One-shot script: the cached PG client keeps the event loop alive,
  // so exit explicitly instead of hanging.
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
