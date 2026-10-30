import type { Collection } from "mongodb";
import { getDb, getMongoClient } from "@/lib/db/mongodb";
import {
  PROJECT_CATEGORY_LABELS,
  type ProjectCategory,
} from "@/lib/portfolio-projects/project-categories";

// One-off: migrate the existing Our Project documents onto the final category
// taxonomy.
//
// Usage (dry run first, then apply):
//   node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/migrate-portfolio-categories.ts
//   node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/migrate-portfolio-categories.ts --apply
//
// Matching is by EXACT title on purpose. These three mappings were decided per
// record; the old label does not determine the new one (two documents labelled
// "Infrastruktur Hijau Terpadu" end up in two different categories), so the
// script must never re-derive a category from the previous value.
//
// Safe to re-run: only documents whose category still differs are written, so a
// second run reports zero modifications. Nothing else in the collection is
// touched.

const COLLECTION = "portfolio_projects";

const MAPPING: ReadonlyArray<{ title: string; category: ProjectCategory }> = [
  {
    title: "Gedung Financial Mandiri PIK 2",
    category: "Commercial High-Rise",
  },
  {
    title: "RSJPD Harapan Kita -Tokushukai",
    category: "Gedung Kesehatan",
  },
  {
    title: "Gedung RSUD WEDA KABUPATEN HALMAHERA TENGAH - MALUKU UTARA",
    category: "Gedung Kesehatan",
  },
];

type PortfolioCategoryRow = { title: string; category: string };

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const db = await getDb();
  // getDb() caches the client on the global object for the Next.js dev server;
  // a one-off script must close it or the process never exits after finishing.
  const client = await getMongoClient();
  try {
    await migrate(db.collection<PortfolioCategoryRow>(COLLECTION), apply);
  } finally {
    await client.close();
  }
}

async function migrate(
  collection: Collection<PortfolioCategoryRow>,
  apply: boolean,
): Promise<void> {
  const total = await collection.countDocuments();
  console.log(`${apply ? "APPLY" : "DRY RUN"} — ${COLLECTION}: ${total} document(s)`);

  let matched = 0;
  let changed = 0;
  const missing: string[] = [];
  const ambiguous: string[] = [];

  for (const { title, category } of MAPPING) {
    const found = await collection.countDocuments({ title });
    if (found === 0) {
      missing.push(title);
      console.log(`  NOT FOUND  ${JSON.stringify(title)}`);
      continue;
    }
    if (found > 1) {
      // Two documents share this title: the per-record decision is no longer
      // unambiguous, so refuse to guess.
      ambiguous.push(title);
      console.log(`  AMBIGUOUS  ${JSON.stringify(title)} (${found} documents)`);
      continue;
    }
    matched += 1;

    if (apply) {
      const result = await collection.updateMany(
        { title, category: { $ne: category } },
        { $set: { category } },
      );
      changed += result.modifiedCount;
      console.log(
        `  ${result.modifiedCount === 1 ? "UPDATED   " : "UNCHANGED "} ${JSON.stringify(title)} -> ${category}`,
      );
    } else {
      const pending = await collection.countDocuments({
        title,
        category: { $ne: category },
      });
      changed += pending;
      console.log(
        `  ${pending === 1 ? "WOULD SET " : "UNCHANGED "} ${JSON.stringify(title)} -> ${category}`,
      );
    }
  }

  console.log(
    `\nmatched=${matched} ${apply ? "modified" : "to-change"}=${changed} not-found=${missing.length} ambiguous=${ambiguous.length}`,
  );

  // Post-conditions: report what a verification pass would check.
  const offList = await collection
    .find(
      { category: { $nin: [...PROJECT_CATEGORY_LABELS] } },
      { projection: { title: 1, category: 1 } },
    )
    .toArray();
  console.log(
    `documents outside the ${PROJECT_CATEGORY_LABELS.length}-category list: ${offList.length}`,
  );
  for (const row of offList) {
    console.log(`  OFF-LIST ${JSON.stringify(row.title)}: ${JSON.stringify(row.category)}`);
  }

  if (missing.length > 0) {
    throw new Error(
      `Refusing to report success: ${missing.length} target title(s) not found in ${COLLECTION}.`,
    );
  }
  if (ambiguous.length > 0) {
    throw new Error(
      `Refusing to report success: ${ambiguous.length} target title(s) matched more than one document.`,
    );
  }
  if (apply && offList.length > 0) {
    throw new Error(
      `Migration incomplete: ${offList.length} document(s) still hold a category outside the final list.`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
