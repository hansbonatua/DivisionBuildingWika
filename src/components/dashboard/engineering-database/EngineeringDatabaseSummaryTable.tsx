import {
  ENGINEERING_DATABASE_CATEGORIES,
  type EngineeringDatabaseCategory,
} from "@/lib/engineering-database/access";
import type { EngineeringDatabaseSummaryRow } from "@/lib/engineering-database/summary";

// Presence matrix: one row per Master Project (zero-record projects included),
// one column per locked category. Cells report presence only — a green check
// when at least one record exists, a dash otherwise. No counts, no UUIDs.

const MATRIX_HEADERS: Record<EngineeringDatabaseCategory, string> = {
  ENGINEERING_DRAWING: "Engineering Drawing",
  ENGINEERING_DESIGN_REPORT: "Engineering Design Report",
  METODE_PELAKSANAAN_PEKERJAAN: "Metode Pelaksanaan",
  SPESIFIKASI_TEKNIS: "Spesifikasi Teknis",
  PROJECT_MASTER_SCHEDULE: "Project Master Schedule",
  BIM: "BIM",
};

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";

const bodyCell = "border-b border-outline/50 px-4 py-3 align-top text-xs text-primary/80";

function PresenceCheck() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label="Tersedia"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

function PresenceAbsent() {
  return (
    <span className="text-primary/30" aria-label="Belum ada">
      {"\u2014"}
    </span>
  );
}

export default function EngineeringDatabaseSummaryTable({
  rows,
}: {
  rows: EngineeringDatabaseSummaryRow[];
}) {
  const columnCount = ENGINEERING_DATABASE_CATEGORIES.length + 2;

  return (
    <section
      aria-label="Summary Matrix Engineering Database"
      className="min-w-0 overflow-hidden rounded-lg border border-outline bg-surface shadow-sm"
    >
      <div className="flex flex-col gap-1 border-b border-outline px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-primary">Summary Matrix</h2>
          <p className="mt-0.5 text-xs text-primary/50">
            Ketersediaan tiap komponen Engineering Database per Master Project.
          </p>
        </div>
        <span className="text-xs font-semibold text-primary/60">
          {rows.length} Master Project
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-xs">
          <thead>
            <tr>
              <th scope="col" className={`${headerCell} w-14`}>
                No
              </th>
              <th scope="col" className={`${headerCell} min-w-56`}>
                Nama Proyek
              </th>
              {ENGINEERING_DATABASE_CATEGORIES.map((category) => (
                <th key={category} scope="col" className={headerCell}>
                  {MATRIX_HEADERS[category]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-4 py-10 text-center text-xs font-medium text-primary/60"
                >
                  Belum ada Master Project untuk ditampilkan.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.projectId}
                  className="transition-colors hover:bg-background/60"
                >
                  <td className={`${bodyCell} tabular-nums text-primary/50`}>
                    {row.no}
                  </td>
                  <td className={`${bodyCell} min-w-56`}>
                    <span className="block font-semibold text-primary">
                      {row.name}
                    </span>
                    {row.location.trim() !== "" ? (
                      <span className="mt-0.5 block text-[11px] text-primary/50">
                        {row.location}
                      </span>
                    ) : null}
                  </td>
                  {ENGINEERING_DATABASE_CATEGORIES.map((category) => (
                    <td key={category} className={`${bodyCell} text-center`}>
                      {row.has[category] ? <PresenceCheck /> : <PresenceAbsent />}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
