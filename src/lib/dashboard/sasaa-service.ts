import { eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import {
  CMS_IMAGE_MAX_BYTES,
  isCmsImageContentType,
} from "@/lib/cms/image-source";
import { getPgDb } from "@/lib/pg/client";
import { isUniqueViolation } from "@/lib/pg/errors";
import {
  engineeringDatabaseEntries,
  knowledgeEntries,
  masterProjects,
  mslAssessments,
  projectDocumentations,
  projectPhotos,
  users,
} from "@/lib/pg/schema";
import {
  categorizeMslScore,
  computeMslScore,
  type MslCategory,
} from "@/lib/msl/score";
import {
  deletePublicCmsBlob,
  headPublicCmsImage,
} from "@/lib/storage/public-image";
import {
  parseProjectPhotoPathname,
  type ProjectPhotoSlot,
} from "@/lib/dashboard/project-photo-storage";

export type SasaaActor = {
  id: string;
  role: string;
  status: string;
};

export type SasaaProjectRef = {
  id: string;
  name: string;
  location: string;
  year: number;
  pic: { id: string; name: string };
};

export type SasaaPhoto = {
  slot: ProjectPhotoSlot;
  url: string;
  alt: string;
};

export type ProjectPhotosData = {
  project: { id: string; name: string };
  photos: SasaaPhoto[];
  photosComplete: boolean;
};

export type SasaaData = ProjectPhotosData & {
  project: SasaaProjectRef;
  metrics: {
    msl: {
      averageScore: number | null;
      category: MslCategory | null;
      assessedMonths: number;
      latestMonth: number | null;
    };
    engineeringDatabase: {
      totalEntries: number;
      categoriesCovered: number;
      totalCategories: number;
    };
    pdoc: {
      year: number | null;
      completedWeeks: number;
      totalWeeks: number;
      documentedMonths: number;
    };
    knowledge: {
      total: number;
      lessonLearn: number;
      bestPractice: number;
      vaVe: number;
    };
  };
};

export const projectPhotoInputSchema = z
  .object({
    slot: z.number().int().min(1).max(4),
    url: z.string().trim().url().max(2048),
    pathname: z.string().trim().min(1).max(512),
    alt: z.string().trim().max(200).optional().nullable(),
  })
  .strict();

export const saveProjectPhotosSchema = z
  .object({
    photos: z.array(projectPhotoInputSchema).length(4),
  })
  .strict();

export type ProjectPhotoInput = z.infer<typeof projectPhotoInputSchema>;

export class SasaaForbiddenError extends Error {
  constructor(message = "Akses foto proyek ditolak") {
    super(message);
    this.name = "SasaaForbiddenError";
  }
}

export class SasaaNotFoundError extends Error {
  constructor(message = "Master Project tidak ditemukan") {
    super(message);
    this.name = "SasaaNotFoundError";
  }
}

export class SasaaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SasaaValidationError";
  }
}

export class SasaaConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SasaaConflictError";
  }
}

const TOTAL_ENGINEERING_CATEGORIES = 6;
const TOTAL_PDOC_WEEKS = 60;
const SLOT_VALUES = [1, 2, 3, 4] as const;
const KM_TYPES = ["lesson_learn", "best_practice", "va_ve"] as const;

const projectRefColumns = {
  id: masterProjects.id,
  name: masterProjects.name,
  location: masterProjects.location,
  year: masterProjects.year,
  picId: masterProjects.picUserId,
  picName: users.name,
};

function assertPhotoManageAccess(actor: SasaaActor): void {
  if (actor.status !== "active" || !hasPermission(actor.role, PERMISSIONS.MASTER_PROJECT_PHOTOS_MANAGE)) {
    throw new SasaaForbiddenError();
  }
}

function toProjectRef(row: {
  id: string;
  name: string;
  location: string;
  year: number;
  picId: string;
  picName: string;
}): SasaaProjectRef {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    year: row.year,
    pic: { id: row.picId, name: row.picName },
  };
}

async function findProjectRef(projectId: string): Promise<SasaaProjectRef | null> {
  const rows = await getPgDb()
    .select(projectRefColumns)
    .from(masterProjects)
    .innerJoin(users, eq(masterProjects.picUserId, users.id))
    .where(eq(masterProjects.id, projectId))
    .limit(1);
  return rows[0] ? toProjectRef(rows[0]) : null;
}

function hasAllPhotoSlots(photos: SasaaPhoto[]): boolean {
  return (
    photos.length === 4 &&
    new Set(photos.map((photo) => photo.slot)).size === 4 &&
    SLOT_VALUES.every((slot) => photos.some((photo) => photo.slot === slot))
  );
}

function toSasaaPhoto(
  projectName: string,
  row: { slot: number; blobUrl: string; altText: string | null },
): SasaaPhoto {
  const slot = row.slot as ProjectPhotoSlot;
  return {
    slot,
    url: row.blobUrl,
    alt: row.altText?.trim() || `${projectName} - foto ${slot}`,
  };
}

export async function listSasaaProjects(): Promise<SasaaProjectRef[]> {
  const rows = await getPgDb()
    .select(projectRefColumns)
    .from(masterProjects)
    .innerJoin(users, eq(masterProjects.picUserId, users.id))
    .orderBy(
      sql`lower(btrim(${masterProjects.name})) asc`,
      sql`lower(btrim(${masterProjects.location})) asc`,
      masterProjects.id,
    );
  return rows.map(toProjectRef);
}

/**
 * Project lookup happens first so a missing project is a clean 404. Every
 * aggregate then runs in one Promise.all batch; there is no query per month,
 * category, or knowledge record.
 */
export async function getSasaaData(projectId: string): Promise<SasaaData | null> {
  const project = await findProjectRef(projectId);
  if (!project) {
    return null;
  }

  const db = getPgDb();
  const [photoRows, mslRows, engineeringRows, pdocRows, kmRows] =
    await Promise.all([
      db
        .select({
          slot: projectPhotos.slot,
          blobUrl: projectPhotos.blobUrl,
          altText: projectPhotos.altText,
        })
        .from(projectPhotos)
        .where(eq(projectPhotos.projectId, projectId))
        .orderBy(projectPhotos.slot),
      db
        .select({
          assessmentMonth: mslAssessments.assessmentMonth,
          engineeringValue: mslAssessments.engineeringValue,
          metodeKerja: mslAssessments.metodeKerja,
          engineeringExecution: mslAssessments.engineeringExecution,
        })
        .from(mslAssessments)
        .where(eq(mslAssessments.projectId, projectId))
        .orderBy(mslAssessments.assessmentMonth)
        .limit(12),
      db
        .select({
          totalEntries: sql<number>`count(*)::int`,
          categoriesCovered: sql<number>`count(distinct ${engineeringDatabaseEntries.category})::int`,
        })
        .from(engineeringDatabaseEntries)
        .where(eq(engineeringDatabaseEntries.projectId, projectId)),
      db
        .select({
          year: projectDocumentations.year,
          month: projectDocumentations.month,
          week1Url: projectDocumentations.week1Url,
          week2Url: projectDocumentations.week2Url,
          week3Url: projectDocumentations.week3Url,
          week4Url: projectDocumentations.week4Url,
          week5Url: projectDocumentations.week5Url,
        })
        .from(projectDocumentations)
        .where(eq(projectDocumentations.projectId, projectId))
        .orderBy(sql`${projectDocumentations.year} desc`, projectDocumentations.month)
        .limit(12),
      db
        .select({
          knowledgeType: knowledgeEntries.knowledgeType,
          total: sql<number>`count(*)::int`,
        })
        .from(knowledgeEntries)
        .where(eq(knowledgeEntries.projectId, projectId))
        .groupBy(knowledgeEntries.knowledgeType),
    ]);

  const photos = photoRows.map((row) => toSasaaPhoto(project.name, row));

  const mslScores = mslRows.map((row) =>
    computeMslScore({
      engineeringValue: Number(row.engineeringValue),
      metodeKerja: Number(row.metodeKerja),
      engineeringExecution: Number(row.engineeringExecution),
    }),
  );
  const averageScore =
    mslScores.length === 0
      ? null
      : Math.round(
          (mslScores.reduce((total, score) => total + score, 0) /
            mslScores.length) *
            100,
        ) / 100;
  const latestMonth =
    mslRows.length === 0
      ? null
      : mslRows.reduce(
          (latest, row) => Math.max(latest, row.assessmentMonth),
          0,
        );

  const latestPdocYear = pdocRows[0]?.year ?? null;
  const latestPdocRows =
    latestPdocYear === null
      ? []
      : pdocRows.filter((row) => row.year === latestPdocYear);
  const completedWeeks = latestPdocRows.reduce(
    (total, row) =>
      total +
      [row.week1Url, row.week2Url, row.week3Url, row.week4Url, row.week5Url].filter(
        (url) => Boolean(url),
      ).length,
    0,
  );

  const knowledge = {
    total: 0,
    lessonLearn: 0,
    bestPractice: 0,
    vaVe: 0,
  };
  for (const row of kmRows) {
    knowledge.total += Number(row.total);
    if (row.knowledgeType === KM_TYPES[0]) knowledge.lessonLearn = Number(row.total);
    if (row.knowledgeType === KM_TYPES[1]) knowledge.bestPractice = Number(row.total);
    if (row.knowledgeType === KM_TYPES[2]) knowledge.vaVe = Number(row.total);
  }

  return {
    project,
    photos,
    photosComplete: hasAllPhotoSlots(photos),
    metrics: {
      msl: {
        averageScore,
        category: averageScore === null ? null : categorizeMslScore(averageScore),
        assessedMonths: mslRows.length,
        latestMonth,
      },
      engineeringDatabase: {
        totalEntries: Number(engineeringRows[0]?.totalEntries ?? 0),
        categoriesCovered: Number(engineeringRows[0]?.categoriesCovered ?? 0),
        totalCategories: TOTAL_ENGINEERING_CATEGORIES,
      },
      pdoc: {
        year: latestPdocYear,
        completedWeeks,
        totalWeeks: TOTAL_PDOC_WEEKS,
        documentedMonths: latestPdocRows.length,
      },
      knowledge,
    },
  };
}

export async function getProjectPhotos(
  projectId: string,
): Promise<ProjectPhotosData | null> {
  const [projectRows, photoRows] = await Promise.all([
    getPgDb()
      .select({ id: masterProjects.id, name: masterProjects.name })
      .from(masterProjects)
      .where(eq(masterProjects.id, projectId))
      .limit(1),
    getPgDb()
      .select({
        slot: projectPhotos.slot,
        blobUrl: projectPhotos.blobUrl,
        altText: projectPhotos.altText,
      })
      .from(projectPhotos)
      .where(eq(projectPhotos.projectId, projectId))
      .orderBy(projectPhotos.slot),
  ]);
  const project = projectRows[0];
  if (!project) {
    return null;
  }
  const photos = photoRows.map((row) => toSasaaPhoto(project.name, row));
  return {
    project,
    photos,
    photosComplete: hasAllPhotoSlots(photos),
  };
}

export async function saveProjectPhotos(
  actor: SasaaActor,
  projectId: string,
  photos: ProjectPhotoInput[],
): Promise<{ projectId: string; photosComplete: true; updatedAt: string }> {
  assertPhotoManageAccess(actor);

  const parsed = saveProjectPhotosSchema.safeParse({ photos });
  if (!parsed.success) {
    throw new SasaaValidationError(
      "Tepat empat foto dengan slot 1 sampai 4 wajib dikirim",
    );
  }

  const input = [...parsed.data.photos].sort((a, b) => a.slot - b.slot);
  if (
    input.length !== 4 ||
    input.some((photo, index) => photo.slot !== SLOT_VALUES[index])
  ) {
    throw new SasaaValidationError("Slot foto harus unik dan berurutan 1 sampai 4");
  }

  const project = await findProjectRef(projectId);
  if (!project) {
    throw new SasaaNotFoundError();
  }

  const pathnames = new Set<string>();
  const normalized: {
    slot: ProjectPhotoSlot;
    url: string;
    pathname: string;
    altText: string;
    contentType: string;
    sizeBytes: number;
  }[] = [];

  for (const photo of input) {
    const parsedPath = parseProjectPhotoPathname(photo.pathname);
    if (
      !parsedPath ||
      parsedPath.projectId !== projectId ||
      parsedPath.slot !== photo.slot
    ) {
      throw new SasaaValidationError(
        "Pathname foto tidak sesuai dengan proyek dan slot",
      );
    }
    if (pathnames.has(photo.pathname)) {
      throw new SasaaValidationError("Pathname foto tidak boleh duplikat");
    }
    pathnames.add(photo.pathname);

    let metadata;
    try {
      metadata = await headPublicCmsImage(photo.pathname);
    } catch (error) {
      throw error;
    }
    if (!metadata) {
      throw new SasaaValidationError(
        "File foto tidak ditemukan di penyimpanan",
      );
    }
    if (metadata.pathname !== photo.pathname || metadata.url !== photo.url) {
      throw new SasaaValidationError(
        "URL atau pathname foto tidak sesuai dengan file yang diunggah",
      );
    }
    if (
      !isCmsImageContentType(metadata.contentType) ||
      metadata.size < 1 ||
      metadata.size > CMS_IMAGE_MAX_BYTES
    ) {
      throw new SasaaValidationError(
        "Foto harus berupa JPEG, PNG, WEBP, atau AVIF dengan ukuran maksimal 5 MB",
      );
    }

    const altText =
      photo.alt?.trim() || `${project.name} - foto ${photo.slot}`;
    if (altText.length > 200) {
      throw new SasaaValidationError("Teks alternatif foto maksimal 200 karakter");
    }

    normalized.push({
      slot: photo.slot,
      url: metadata.url,
      pathname: metadata.pathname,
      altText,
      contentType: metadata.contentType,
      sizeBytes: metadata.size,
    });
  }

  const claimed = await getPgDb()
    .select({
      projectId: projectPhotos.projectId,
      blobPathname: projectPhotos.blobPathname,
    })
    .from(projectPhotos)
    .where(inArray(projectPhotos.blobPathname, [...pathnames]));
  if (claimed.some((row) => row.projectId !== projectId)) {
    throw new SasaaConflictError(
      "Salah satu foto sudah dipakai oleh proyek lain",
    );
  }

  let oldPathnames: string[] = [];
  try {
    oldPathnames = await getPgDb().transaction(async (tx) => {
      // Serialize the replace for this project so two Admins cannot both read
      // the same old rows and insert overlapping slots.
      const locked = await tx
        .select({ id: masterProjects.id })
        .from(masterProjects)
        .where(eq(masterProjects.id, projectId))
        .for("update")
        .limit(1);
      if (!locked[0]) {
        throw new SasaaNotFoundError();
      }

      const existing = await tx
        .select({ blobPathname: projectPhotos.blobPathname })
        .from(projectPhotos)
        .where(eq(projectPhotos.projectId, projectId));
      await tx.delete(projectPhotos).where(eq(projectPhotos.projectId, projectId));
      await tx.insert(projectPhotos).values(
        normalized.map((photo) => ({
          projectId,
          slot: photo.slot,
          blobUrl: photo.url,
          blobPathname: photo.pathname,
          altText: photo.altText,
          contentType: photo.contentType,
          sizeBytes: photo.sizeBytes,
          createdBy: actor.id,
          updatedBy: actor.id,
        })),
      );
      return existing.map((row) => row.blobPathname);
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new SasaaConflictError(
        "Salah satu foto sudah dipakai oleh proyek lain",
      );
    }
    throw error;
  }

  // Database is authoritative and already committed. Blob deletion is
  // best-effort; cleanup re-checks references so a pathname still in use is
  // never removed.
  await cleanupProjectPhotoBlobs(oldPathnames);

  return {
    projectId,
    photosComplete: true,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Best-effort cleanup for old project-photo objects. Only pathnames inside the
 * project-photo namespace are touched, and only when no database row references
 * them any more. Storage failures are logged and never fail the committed DB
 * operation.
 */
export async function cleanupProjectPhotoBlobs(
  pathnames: readonly string[],
): Promise<void> {
  const candidates = [...new Set(pathnames)].filter(
    (pathname) => parseProjectPhotoPathname(pathname) !== null,
  );
  if (candidates.length === 0) {
    return;
  }

  let referenced = new Set<string>();
  try {
    const rows = await getPgDb()
      .select({ blobPathname: projectPhotos.blobPathname })
      .from(projectPhotos)
      .where(inArray(projectPhotos.blobPathname, candidates));
    referenced = new Set(rows.map((row) => row.blobPathname));
  } catch (error) {
    console.warn("Gagal memeriksa referensi foto proyek", error);
    return;
  }

  for (const pathname of candidates) {
    if (referenced.has(pathname)) continue;
    try {
      await deletePublicCmsBlob(pathname);
    } catch (error) {
      console.warn(`Gagal menghapus blob foto proyek ${pathname}`, error);
    }
  }
}
