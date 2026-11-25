/**
 * One-off migration: Vercel Blob -> MinIO (S3).
 *
 * ⚠️  NOT PART OF THE BUILD OR RUNTIME. Run it manually, once, from a machine
 * that can reach both Vercel Blob and the MinIO endpoint.
 *
 *   npx tsx scripts/migrate-blob-to-minio.ts --dry-run   # report only
 *   npx tsx scripts/migrate-blob-to-minio.ts             # copy + rewrite
 *
 * What it does, in order:
 *   1. lists every object in BOTH Vercel Blob stores and copies it to the
 *      matching MinIO bucket under the SAME pathname (and content type), so no
 *      pathname stored in the database has to change;
 *   2. rewrites the full Vercel URLs that were persisted in the database to the
 *      canonical MinIO URL `${S3_ENDPOINT_PUBLIC}/${S3_BUCKET_PUBLIC}/${pathname}`
 *      — users.photo_url, project_photos.blob_url,
 *      organization_structure.image_url, learning_contents.thumbnail_url and
 *      `imageUrl` in the five CMS MongoDB collections.
 *
 * Pathname-only columns (template_forms, regulation_document,
 * learning_attachments, berkas_*) need NO update: their keys are identical in
 * MinIO, which is why step 1 preserves pathnames exactly.
 *
 * Idempotent: rows whose URL is no longer a Vercel Blob URL are skipped, so a
 * second run (or a run after a partial failure) only handles what is left.
 *
 * Requires (Vercel side): BLOB_READ_WRITE_TOKEN (private store),
 *   CMS_BLOB_READ_WRITE_TOKEN (public store).
 * Requires (MinIO side): S3_ENDPOINT_INTERNAL, S3_ENDPOINT_PUBLIC, S3_REGION,
 *   S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET_PUBLIC, S3_BUCKET_PRIVATE.
 * Requires (database): DATABASE_URL, MONGODB_URI, MONGODB_DB_NAME.
 *
 * `@vercel/blob` is a devDependency for this script only; no src/ module
 * imports it any more.
 */

import { Buffer } from "node:buffer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { get, list } from "@vercel/blob";
import { eq } from "drizzle-orm";
import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { getPgDb } from "@/lib/pg/client";
import {
  learningContents,
  organizationStructure,
  projectPhotos,
  users,
} from "@/lib/pg/schema";
import {
  bucketNameFor,
  getInternalS3Client,
  objectUrl,
  readS3Config,
  type S3BucketVisibility,
} from "@/lib/storage/s3";

const DRY_RUN = process.argv.includes("--dry-run");
const PAGE_SIZE = 100;

// Legacy Vercel Blob public host, used only to recognize URLs written before
// this migration.
const VERCEL_BLOB_HOST_RE = /(^|\.)public\.blob\.vercel-storage\.com$/i;

type StoreMigration = {
  label: string;
  visibility: S3BucketVisibility;
  token: string | undefined;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function isVercelBlobUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    return VERCEL_BLOB_HOST_RE.test(parsed.hostname);
  } catch {
    return false;
  }
}

function pathnameFromVercelUrl(value: string): string | null {
  if (!isVercelBlobUrl(value)) return null;
  try {
    const parsed = new URL(value);
    const pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    return pathname.length > 0 ? pathname : null;
  } catch {
    return null;
  }
}

/**
 * The MinIO URL for a row, or null when the row does not need rewriting.
 * A pathname column is preferred over parsing the URL: it is the authoritative
 * storage identity and survives URL-encoding differences.
 */
function rewrittenUrl(
  currentUrl: string | null | undefined,
  pathname: string | null | undefined,
): string | null {
  if (typeof currentUrl !== "string" || currentUrl.length === 0) return null;
  if (!isVercelBlobUrl(currentUrl)) return null;
  const key =
    typeof pathname === "string" && pathname.length > 0
      ? pathname
      : pathnameFromVercelUrl(currentUrl);
  if (!key) return null;
  return objectUrl("public", key);
}

// ---------------------------------------------------------------------------
// Step 1 — copy objects
// ---------------------------------------------------------------------------

async function copyStore(
  store: StoreMigration,
  s3: ReturnType<typeof getInternalS3Client>,
  bucket: string,
): Promise<{ copied: number; failed: number }> {
  let copied = 0;
  let failed = 0;
  let cursor: string | undefined;

  do {
    const page = await list({
      token: store.token,
      cursor,
      limit: PAGE_SIZE,
    });

    for (const blob of page.blobs) {
      try {
        const result = await get(blob.pathname, {
          access: store.visibility,
          token: store.token,
        });
        if (!result || result.statusCode !== 200) {
          throw new Error(`download returned status ${result?.statusCode ?? "none"}`);
        }
        const bytes = Buffer.from(
          await new Response(result.stream).arrayBuffer(),
        );
        if (DRY_RUN) {
          console.log(
            `[dry-run] would copy ${store.label}/${blob.pathname} (${bytes.byteLength} B)`,
          );
          copied += 1;
          continue;
        }
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: blob.pathname,
            Body: bytes,
            ContentType:
              result.blob.contentType ?? "application/octet-stream",
          }),
        );
        copied += 1;
        console.log(`copied ${store.label}/${blob.pathname}`);
      } catch (error) {
        failed += 1;
        console.error(
          `FAILED ${store.label}/${blob.pathname}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return { copied, failed };
}

// ---------------------------------------------------------------------------
// Step 2 — rewrite PostgreSQL URLs
// ---------------------------------------------------------------------------

async function rewritePostgres(): Promise<number> {
  const db = getPgDb();
  let updated = 0;

  const userRows = await db
    .select({ id: users.id, photoUrl: users.photoUrl })
    .from(users);
  for (const row of userRows) {
    const next = rewrittenUrl(row.photoUrl, null);
    if (!next) continue;
    if (DRY_RUN) {
      console.log(`[dry-run] users.photo_url ${row.id}: ${row.photoUrl} -> ${next}`);
      updated += 1;
      continue;
    }
    await db.update(users).set({ photoUrl: next }).where(eq(users.id, row.id));
    updated += 1;
  }

  const photoRows = await db
    .select({
      id: projectPhotos.id,
      blobUrl: projectPhotos.blobUrl,
      blobPathname: projectPhotos.blobPathname,
    })
    .from(projectPhotos);
  for (const row of photoRows) {
    const next = rewrittenUrl(row.blobUrl, row.blobPathname);
    if (!next) continue;
    if (DRY_RUN) {
      console.log(
        `[dry-run] project_photos.blob_url ${row.id}: ${row.blobUrl} -> ${next}`,
      );
      updated += 1;
      continue;
    }
    await db
      .update(projectPhotos)
      .set({ blobUrl: next })
      .where(eq(projectPhotos.id, row.id));
    updated += 1;
  }

  const organizationRows = await db
    .select({
      id: organizationStructure.id,
      imageUrl: organizationStructure.imageUrl,
      blobPathname: organizationStructure.blobPathname,
    })
    .from(organizationStructure);
  for (const row of organizationRows) {
    const next = rewrittenUrl(row.imageUrl, row.blobPathname);
    if (!next) continue;
    if (DRY_RUN) {
      console.log(
        `[dry-run] organization_structure.image_url ${row.id}: ${row.imageUrl} -> ${next}`,
      );
      updated += 1;
      continue;
    }
    await db
      .update(organizationStructure)
      .set({ imageUrl: next })
      .where(eq(organizationStructure.id, row.id));
    updated += 1;
  }

  const learningRows = await db
    .select({
      id: learningContents.id,
      thumbnailUrl: learningContents.thumbnailUrl,
      thumbnailPathname: learningContents.thumbnailPathname,
    })
    .from(learningContents);
  for (const row of learningRows) {
    const next = rewrittenUrl(row.thumbnailUrl, row.thumbnailPathname);
    if (!next) continue;
    if (DRY_RUN) {
      console.log(
        `[dry-run] learning_contents.thumbnail_url ${row.id}: ${row.thumbnailUrl} -> ${next}`,
      );
      updated += 1;
      continue;
    }
    await db
      .update(learningContents)
      .set({ thumbnailUrl: next })
      .where(eq(learningContents.id, row.id));
    updated += 1;
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Step 2 (continued) — rewrite CMS MongoDB URLs
// ---------------------------------------------------------------------------

const CMS_COLLECTIONS = [
  "heroes",
  "portfolio_projects",
  "green_building_certificates",
  "clients",
  "social_posts",
] as const;

type CmsImageDocument = {
  _id: ObjectId;
  imageUrl?: string | null;
  blobPathname?: string | null;
};

async function rewriteMongo(): Promise<number> {
  const db = await getDb();
  let updated = 0;

  for (const name of CMS_COLLECTIONS) {
    const collection = db.collection<CmsImageDocument>(name);
    const docs = await collection.find({}).toArray();

    for (const doc of docs) {
      const next = rewrittenUrl(doc.imageUrl, doc.blobPathname);
      if (!next) continue;
      if (DRY_RUN) {
        console.log(
          `[dry-run] ${name}/${String(doc._id)}: ${doc.imageUrl} -> ${next}`,
        );
        updated += 1;
        continue;
      }
      await collection.updateOne(
        { _id: doc._id },
        { $set: { imageUrl: next } },
      );
      updated += 1;
    }
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const config = readS3Config();
  if (!config) {
    throw new Error(
      "S3 is not configured. Set S3_ENDPOINT_INTERNAL, S3_ENDPOINT_PUBLIC, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET_PUBLIC and S3_BUCKET_PRIVATE.",
    );
  }

  const publicToken = readEnv("CMS_BLOB_READ_WRITE_TOKEN");
  const privateToken = readEnv("BLOB_READ_WRITE_TOKEN");
  if (!publicToken || !privateToken) {
    throw new Error(
      "Both CMS_BLOB_READ_WRITE_TOKEN (public store) and BLOB_READ_WRITE_TOKEN (private store) are required to read the Vercel Blob side.",
    );
  }

  const s3 = getInternalS3Client(config);

  console.log(
    DRY_RUN
      ? "DRY RUN — nothing is copied or written."
      : "LIVE RUN — objects will be copied and database URLs rewritten.",
  );

  const publicStore: StoreMigration = {
    label: "public",
    visibility: "public",
    token: publicToken,
  };
  const privateStore: StoreMigration = {
    label: "private",
    visibility: "private",
    token: privateToken,
  };

  const publicResult = await copyStore(
    publicStore,
    s3,
    bucketNameFor(config, "public"),
  );
  const privateResult = await copyStore(
    privateStore,
    s3,
    bucketNameFor(config, "private"),
  );

  const pgUpdated = await rewritePostgres();
  const mongoUpdated = await rewriteMongo();

  console.log("\n=== Summary ===");
  console.log(
    `public  store: ${publicResult.copied} copied, ${publicResult.failed} failed`,
  );
  console.log(
    `private store: ${privateResult.copied} copied, ${privateResult.failed} failed`,
  );
  console.log(
    `${DRY_RUN ? "would update" : "updated"} ${pgUpdated} PostgreSQL rows, ${mongoUpdated} MongoDB documents`,
  );
  if (publicResult.failed > 0 || privateResult.failed > 0) {
    console.error(
      "Some objects failed to copy. Re-run after fixing the cause; copied objects are simply overwritten with identical bytes.",
    );
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(
    "Migration failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
