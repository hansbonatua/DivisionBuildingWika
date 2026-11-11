import { getPgDb, type PgDatabase } from "@/lib/pg/client";
import {
  activityLogs,
  type ActivityAction,
  type ActivityEntityType,
} from "@/lib/pg/schema";

type PgTransaction = Parameters<Parameters<PgDatabase["transaction"]>[0]>[0];
type ActivityDb = PgDatabase | PgTransaction;

/**
 * Appends one dashboard activity row. Callers pass the mutation transaction
 * when one exists so the activity and the business change commit or roll back
 * together. Keep this helper limited to Berkas, Master Project, and PDOC.
 */
export async function logActivity(
  actorId: string,
  action: ActivityAction,
  entityType: ActivityEntityType,
  title: string,
  tx?: PgTransaction,
): Promise<void> {
  const db: ActivityDb = tx ?? getPgDb();
  const normalizedTitle = title.trim().slice(0, 200) || "Tanpa judul";

  await db.insert(activityLogs).values({
    actorUserId: actorId,
    action,
    entityType,
    title: normalizedTitle,
  });
}