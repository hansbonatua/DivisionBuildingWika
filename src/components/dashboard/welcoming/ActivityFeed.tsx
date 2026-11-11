import type { ActivityFeedItem } from "@/lib/dashboard/service";

const actionLabels: Record<ActivityFeedItem["action"], string> = {
  CREATE: "menambahkan",
  UPDATE: "memperbarui",
  DELETE: "menghapus",
  SIGN: "menandatangani",
  REJECT: "menolak",
  REVISE: "merevisi",
};

const entityLabels: Record<ActivityFeedItem["entityType"], string> = {
  BERKAS: "Berkas",
  MASTER_PROJECT: "Master Project",
  PDOC: "Project Documentation",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatActivityTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export default function ActivityFeed({ activities }: { activities: ActivityFeedItem[] }) {
  return (
    <section className="rounded-2xl border border-outline/70 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">Activity</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-primary">Aktivitas Terbaru</h2>
        </div>
        <span className="text-[11px] font-semibold text-primary/45">5 aktivitas terakhir</span>
      </div>

      {activities.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-outline bg-background/40 px-5 py-9 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-secondary">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </span>
          <p className="mt-3 text-sm font-semibold text-primary">Belum ada aktivitas tercatat</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-primary/50">
            Aktivitas akan muncul setelah ada perubahan pada Berkas, Master Project, atau PDOC.
          </p>
        </div>
      ) : (
        <ol className="mt-6">
          {activities.map((activity, index) => (
            <li key={activity.id} className="flex gap-3.5">
              <div className="flex w-9 shrink-0 flex-col items-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-[11px] font-bold text-secondary">
                  {initials(activity.actorName)}
                </span>
                {index < activities.length - 1 ? (
                  <span className="mt-1 min-h-5 w-px flex-1 bg-outline/60" aria-hidden="true" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1 pb-5 last:pb-0">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                  <p className="text-sm leading-6 text-primary/65">
                    <span className="font-semibold text-primary">{activity.actorName}</span>{" "}
                    {actionLabels[activity.action]}{" "}
                    {entityLabels[activity.entityType]}{" "}
                    <span className="font-medium text-primary">“{activity.title}”</span>
                  </p>
                  <time
                    dateTime={activity.createdAt}
                    className="shrink-0 text-[11px] font-medium text-primary/40"
                  >
                    {formatActivityTime(activity.createdAt)}
                  </time>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
