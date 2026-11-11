import { and, asc, count, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { canValidateBerkas } from "@/lib/berkas/access";
import { getPgDb } from "@/lib/pg/client";
import {
  activityLogs,
  berkasPengajuan,
  berkasValidasi,
  masterProjects,
  mslAssessments,
  programKerja,
  programKerjaMonthly,
  programKerjaPics,
  users,
  type ActivityAction,
  type ActivityEntityType,
} from "@/lib/pg/schema";
import { isAdmin, isHeadOffice, isProject } from "@/lib/users/roles";

export type DashboardActor = {
  id: string;
  role: string;
};

export type DashboardActionKind = "TTD" | "REJECTED" | "RI";

export type DashboardAction = {
  id: string;
  title: string;
  meta: string;
  href: string;
  kind: DashboardActionKind;
};

export type DashboardStats = {
  totalProjects: number;
  completedBerkas: number;
  mslAverage: number | null;
  activeUsers: number | null;
};

export type DashboardActions = {
  pendingTtd: DashboardAction[];
  rejectedBerkas: DashboardAction[];
  missingRi: DashboardAction[];
};

export type ActivityFeedItem = {
  id: string;
  actorName: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  title: string;
  createdAt: string;
};

export type DashboardData = {
  stats: DashboardStats;
  actions: DashboardActions;
  activities: ActivityFeedItem[];
};

function currentPeriod(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

async function getStats(actor: DashboardActor): Promise<DashboardStats> {
  const db = getPgDb();
  const scopedToProject = isProject(actor.role);
  const { year } = currentPeriod();

  const projectWhere = scopedToProject
    ? eq(masterProjects.picUserId, actor.id)
    : undefined;
  const berkasWhere = scopedToProject
    ? eq(berkasPengajuan.pemohonId, actor.id)
    : undefined;

  const [projectRows, completedRows, mslRows, userRows] = await Promise.all([
    db.select({ value: count() }).from(masterProjects).where(projectWhere),
    db
      .select({ value: count() })
      .from(berkasPengajuan)
      .where(and(eq(berkasPengajuan.status, "SELESAI"), berkasWhere)),
    scopedToProject
      ? Promise.resolve([{ value: null as string | null }])
      : db
          .select({
            value: sql<string | null>`round(avg(round((
              ${mslAssessments.engineeringValue} +
              ${mslAssessments.metodeKerja} +
              ${mslAssessments.engineeringExecution}
            ) / 3.0, 2)), 2)`,
          })
          .from(mslAssessments)
          .innerJoin(
            masterProjects,
            eq(mslAssessments.projectId, masterProjects.id),
          )
          .where(eq(masterProjects.year, year)),
    scopedToProject
      ? Promise.resolve([{ value: null as string | null }])
      : db
          .select({ value: count() })
          .from(users)
          .where(eq(users.status, "active")),
  ]);

  return {
    totalProjects: Number(projectRows[0]?.value ?? 0),
    completedBerkas: Number(completedRows[0]?.value ?? 0),
    mslAverage: mslRows[0]?.value == null ? null : Number(mslRows[0].value),
    activeUsers: userRows[0]?.value == null ? null : Number(userRows[0].value),
  };
}

async function getPendingTtdActions(userId: string): Promise<DashboardAction[]> {
  const rows = await getPgDb()
    .select({
      id: berkasPengajuan.id,
      title: berkasPengajuan.judul,
      urutan: berkasValidasi.urutan,
    })
    .from(berkasValidasi)
    .innerJoin(
      berkasPengajuan,
      eq(berkasValidasi.berkasId, berkasPengajuan.id),
    )
    .where(
      and(
        eq(berkasValidasi.validatorUserId, userId),
        isNull(berkasValidasi.ttdPathname),
        or(
          and(
            eq(berkasValidasi.urutan, 1),
            eq(berkasPengajuan.status, "MENUNGGU_TTD_1"),
          ),
          and(
            eq(berkasValidasi.urutan, 2),
            eq(berkasPengajuan.status, "MENUNGGU_TTD_2"),
          ),
        ),
      ),
    )
    .orderBy(desc(berkasPengajuan.createdAt))
    .limit(5);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    meta: `Menunggu TTD ${row.urutan}`,
    href: "/dashboard/berkas/verifikasi",
    kind: "TTD",
  }));
}

async function getRejectedActions(userId: string): Promise<DashboardAction[]> {
  const rows = await getPgDb()
    .select({
      id: berkasPengajuan.id,
      title: berkasPengajuan.judul,
      revisionCount: berkasPengajuan.revisionCount,
    })
    .from(berkasPengajuan)
    .where(
      and(
        eq(berkasPengajuan.pemohonId, userId),
        eq(berkasPengajuan.status, "DITOLAK"),
      ),
    )
    .orderBy(desc(berkasPengajuan.rejectedAt))
    .limit(5);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    meta: row.revisionCount > 0 ? `Revisi ke-${row.revisionCount}` : "Perlu revisi",
    href: "/dashboard/berkas/ajukan",
    kind: "REJECTED",
  }));
}

async function getMissingRiActions(actor: DashboardActor): Promise<DashboardAction[]> {
  if (!isAdmin(actor.role) && !isHeadOffice(actor.role)) {
    return [];
  }

  const db = getPgDb();
  const { year, month } = currentPeriod();
  const conditions = and(
    eq(programKerja.year, year),
    isNull(programKerjaMonthly.riValue),
    lte(programKerja.startMonth, month),
    gte(programKerja.endMonth, month),
  );
  const base = db
    .select({ id: programKerja.id, title: programKerja.name })
    .from(programKerja)
    .innerJoin(
      programKerjaMonthly,
      and(
        eq(programKerjaMonthly.programKerjaId, programKerja.id),
        eq(programKerjaMonthly.month, month),
      ),
    );

  const rows = isHeadOffice(actor.role)
    ? await base
        .innerJoin(
          programKerjaPics,
          and(
            eq(programKerjaPics.programKerjaId, programKerja.id),
            eq(programKerjaPics.userId, actor.id),
          ),
        )
        .where(conditions)
        .orderBy(asc(programKerja.name))
        .limit(5)
    : await base.where(conditions).orderBy(asc(programKerja.name)).limit(5);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    meta: "Belum isi RI bulan ini",
    href: `/dashboard/program-kerja/manage/${row.id}/edit`,
    kind: "RI",
  }));
}

async function getActions(actor: DashboardActor): Promise<DashboardActions> {
  const [pendingTtd, rejectedBerkas, missingRi] = await Promise.all([
    canValidateBerkas(actor.role)
      ? getPendingTtdActions(actor.id)
      : Promise.resolve([]),
    getRejectedActions(actor.id),
    getMissingRiActions(actor),
  ]);

  return { pendingTtd, rejectedBerkas, missingRi };
}

async function getActivities(actor: DashboardActor): Promise<ActivityFeedItem[]> {
  const rows = await getPgDb()
    .select({
      id: activityLogs.id,
      actorName: users.name,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      title: activityLogs.title,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .leftJoin(users, eq(users.id, activityLogs.actorUserId))
    .where(
      isProject(actor.role)
        ? eq(activityLogs.actorUserId, actor.id)
        : undefined,
    )
    .orderBy(desc(activityLogs.createdAt), desc(activityLogs.id))
    .limit(5);

  return rows.map((row) => ({
    id: row.id,
    actorName: row.actorName ?? "Pengguna dihapus",
    action: row.action,
    entityType: row.entityType,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getDashboardData(
  actor: DashboardActor,
): Promise<DashboardData> {
  const [stats, actions, activities] = await Promise.all([
    getStats(actor),
    getActions(actor),
    getActivities(actor),
  ]);

  return { stats, actions, activities };
}