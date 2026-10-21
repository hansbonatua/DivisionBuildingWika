import type {
  ProgramKerjaStatus,
  SummaryProgramRow,
} from "@/lib/program-kerja/summary";
import {
  formatSummaryAchievement,
  formatSummaryCount,
  formatSummaryPeriod,
} from "@/lib/program-kerja/summaryFormat";

const STATUS_BADGES: Record<ProgramKerjaStatus, string> = {
  "Belum Mulai": "border-slate-200 bg-slate-100 text-slate-600",
  Berjalan: "border-blue-200 bg-blue-50 text-blue-700",
  Tercapai: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Over Target": "border-amber-200 bg-amber-50 text-amber-700",
};

const headerCell =
  "whitespace-nowrap border-b border-outline bg-background px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-primary/60";

const bodyCell =
  "border-b border-outline/50 px-4 py-3 align-top text-xs text-primary/80";

function PicList({ pics }: { pics: SummaryProgramRow["pics"] }) {
  if (pics.length === 0) {
    return <span className="text-primary/40">—</span>;
  }

  return (
    <span className="flex flex-col gap-0.5">
      {pics.map((pic) => (
        <span key={pic.id} className="leading-5">
          {pic.name}
        </span>
      ))}
    </span>
  );
}

export default function ProgramKerjaSummaryTable({
  programs,
}: {
  programs: SummaryProgramRow[];
}) {
  return (
    <section
      aria-label="Daftar Program Kerja"
      className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm"
    >
      <div className="flex flex-col gap-1 border-b border-outline px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-primary">Daftar Program Kerja</h2>
          <p className="mt-0.5 text-xs text-primary/50">
            Rincian program sesuai filter yang sedang aktif.
          </p>
        </div>
        <span className="text-xs font-semibold text-primary/60">
          {formatSummaryCount(programs.length)} program
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-xs">
          <thead>
            <tr>
              <th scope="col" className={headerCell}>
                Program Kerja
              </th>
              <th scope="col" className={headerCell}>
                Kelompok
              </th>
              <th scope="col" className={headerCell}>
                Unit
              </th>
              <th scope="col" className={headerCell}>
                Periode
              </th>
              <th scope="col" className={headerCell}>
                PIC
              </th>
              <th scope="col" className={headerCell}>
                Pencapaian
              </th>
              <th scope="col" className={headerCell}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {programs.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-xs font-medium text-primary/60"
                >
                  Tidak ada Program Kerja untuk filter yang dipilih.
                </td>
              </tr>
            ) : (
              programs.map((program) => (
                <tr
                  key={program.id}
                  className="transition-colors hover:bg-background/60"
                >
                  <td className={`${bodyCell} min-w-64 font-semibold text-primary`}>
                    {program.name}
                  </td>
                  <td className={`${bodyCell} min-w-40`}>
                    {program.group?.name ?? "Tanpa Kelompok"}
                  </td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{program.unit}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>
                    {formatSummaryPeriod(program.startMonth, program.endMonth)}
                  </td>
                  <td className={`${bodyCell} min-w-48`}>
                    <PicList pics={program.pics} />
                  </td>
                  <td className={`${bodyCell} whitespace-nowrap font-semibold text-primary`}>
                    {formatSummaryAchievement(program.achievement)}
                  </td>
                  <td className={`${bodyCell} whitespace-nowrap`}>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGES[program.status]}`}
                    >
                      {program.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
