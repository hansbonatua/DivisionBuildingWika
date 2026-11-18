import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { getPgDb } from "@/lib/pg/client";
import {
  masterProjects,
  projectGreenCertificates,
  type NewPgProjectGreenCertificate,
} from "@/lib/pg/schema";

// Server-only persistence for Sertifikasi Green Building. The project name is
// never stored on the certificate row; every read joins master_projects.

export type ProjectGreenCertificateRow = {
  id: string;
  projectId: string;
  projectName: string;
  projectLocation: string;
  projectYear: number;
  projectValue: string;
  location: string;
  certificateYear: number;
  lembaga: string;
  level: string;
  status: string;
  documentationUrl: string | null;
  createdById: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectOptionRow = {
  id: string;
  name: string;
  location: string;
  year: number;
};

export type ProjectGreenCertificateInsert = Pick<
  NewPgProjectGreenCertificate,
  | "projectId"
  | "projectValue"
  | "location"
  | "certificateYear"
  | "lembaga"
  | "level"
  | "status"
  | "documentationUrl"
  | "createdBy"
>;

export type ProjectGreenCertificateUpdate = Pick<
  NewPgProjectGreenCertificate,
  | "projectId"
  | "projectValue"
  | "location"
  | "certificateYear"
  | "lembaga"
  | "level"
  | "status"
  | "documentationUrl"
  | "updatedBy"
>;

const certificateColumns = {
  id: projectGreenCertificates.id,
  projectId: projectGreenCertificates.projectId,
  projectName: masterProjects.name,
  projectLocation: masterProjects.location,
  projectYear: masterProjects.year,
  projectValue: projectGreenCertificates.projectValue,
  location: projectGreenCertificates.location,
  certificateYear: projectGreenCertificates.certificateYear,
  lembaga: projectGreenCertificates.lembaga,
  level: projectGreenCertificates.level,
  status: projectGreenCertificates.status,
  documentationUrl: projectGreenCertificates.documentationUrl,
  createdById: projectGreenCertificates.createdBy,
  updatedById: projectGreenCertificates.updatedBy,
  createdAt: projectGreenCertificates.createdAt,
  updatedAt: projectGreenCertificates.updatedAt,
};

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function certificateQuery() {
  return getPgDb()
    .select(certificateColumns)
    .from(projectGreenCertificates)
    .innerJoin(
      masterProjects,
      eq(projectGreenCertificates.projectId, masterProjects.id),
    );
}

// `year` filters the certificate year; `search` matches only the canonical
// Master Project name. `%` and `_` are escaped so user input stays literal and
// the existing trigram index remains usable for search.
export async function listProjectGreenCertificateRows(
  year?: number,
  search?: string,
): Promise<ProjectGreenCertificateRow[]> {
  const term = search?.trim();
  const conditions = [
    year !== undefined
      ? eq(projectGreenCertificates.certificateYear, year)
      : undefined,
    term
      ? ilike(masterProjects.name, `%${escapeLikePattern(term)}%`)
      : undefined,
  ].filter((condition) => condition !== undefined);

  return certificateQuery()
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      desc(projectGreenCertificates.certificateYear),
      asc(masterProjects.name),
      asc(projectGreenCertificates.id),
    );
}

export async function findProjectGreenCertificateRowById(
  id: string,
): Promise<ProjectGreenCertificateRow | null> {
  const rows = await certificateQuery()
    .where(eq(projectGreenCertificates.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listAvailableCertificateYears(): Promise<number[]> {
  const rows = await getPgDb()
    .selectDistinct({
      certificateYear: projectGreenCertificates.certificateYear,
    })
    .from(projectGreenCertificates)
    .orderBy(desc(projectGreenCertificates.certificateYear));
  return rows.map((row) => row.certificateYear);
}

export async function insertProjectGreenCertificate(
  data: ProjectGreenCertificateInsert,
): Promise<string> {
  const rows = await getPgDb()
    .insert(projectGreenCertificates)
    .values({ ...data, updatedBy: null })
    .returning({ id: projectGreenCertificates.id });
  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create project green certificate");
  }
  return created.id;
}

export async function updateProjectGreenCertificateRow(
  id: string,
  data: ProjectGreenCertificateUpdate,
): Promise<boolean> {
  const rows = await getPgDb()
    .update(projectGreenCertificates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projectGreenCertificates.id, id))
    .returning({ id: projectGreenCertificates.id });
  return rows.length > 0;
}

export async function deleteProjectGreenCertificateRow(
  id: string,
): Promise<boolean> {
  const rows = await getPgDb()
    .delete(projectGreenCertificates)
    .where(eq(projectGreenCertificates.id, id))
    .returning({ id: projectGreenCertificates.id });
  return rows.length > 0;
}

// Narrow picker feed over the canonical project directory. Search covers name
// and location, and the SQL-level limit keeps the payload bounded.
export async function searchProjectOptionRows(
  q: string | undefined,
  limit = 50,
): Promise<ProjectOptionRow[]> {
  const term = q?.trim();
  const boundedLimit = Math.min(Math.max(limit, 1), 50);
  const base = getPgDb()
    .select({
      id: masterProjects.id,
      name: masterProjects.name,
      location: masterProjects.location,
      year: masterProjects.year,
    })
    .from(masterProjects);

  if (term) {
    const pattern = `%${escapeLikePattern(term)}%`;
    return base
      .where(
        or(
          ilike(masterProjects.name, pattern),
          ilike(masterProjects.location, pattern),
        ),
      )
      .orderBy(
        desc(masterProjects.year),
        asc(masterProjects.name),
        asc(masterProjects.id),
      )
      .limit(boundedLimit);
  }

  return base
    .orderBy(
      desc(masterProjects.year),
      asc(masterProjects.name),
      asc(masterProjects.id),
    )
    .limit(boundedLimit);
}

export async function findMasterProjectRef(
  id: string,
): Promise<ProjectOptionRow | null> {
  const rows = await getPgDb()
    .select({
      id: masterProjects.id,
      name: masterProjects.name,
      location: masterProjects.location,
      year: masterProjects.year,
    })
    .from(masterProjects)
    .where(eq(masterProjects.id, id))
    .limit(1);
  return rows[0] ?? null;
}
