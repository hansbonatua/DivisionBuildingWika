import type { ReactNode } from "react";
import { MSL_CATEGORY_LABELS } from "@/lib/msl/score";
import { isMslMonth, MSL_MONTH_LABELS } from "@/lib/msl/period";
import type { SasaaMetrics } from "./types";

const numberFormat = new Intl.NumberFormat("id-ID");
const decimalFormat = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const icons: Record<"msl" | "engineering" | "pdoc" | "knowledge", ReactNode> = {
  msl: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M4 20V4M4 20h17" />
      <path d="m7 16 3.5-4 3 2 5-7" />
    </svg>
  ),
  engineering: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  ),
  pdoc: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" />
      <path d="M8 14h3M8 18h3M15 14h1" />
    </svg>
  ),
  knowledge: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
};

const tones = {
  msl: "bg-amber-50 text-amber-700",
  engineering: "bg-blue-50 text-secondary",
  pdoc: "bg-violet-50 text-violet-700",
  knowledge: "bg-emerald-50 text-emerald-700",
} as const;

function StatCard({
  tone,
  label,
  value,
  hint,
  detail,
  unavailable = false,
}: {
  tone: keyof typeof tones;
  label: string;
  value: string;
  hint: string;
  detail: string;
  unavailable?: boolean;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-outline/70 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-primary/55">
          {label}
        </p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          {icons[tone]}
        </span>
      </div>
      <p
        className={`mt-5 text-3xl font-bold tracking-tight ${
          unavailable ? "text-primary/35" : "text-primary"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-primary/70">{hint}</p>
      <p className="mt-auto pt-3 text-[11px] leading-relaxed text-primary/45">
        {detail}
      </p>
    </article>
  );
}

export default function SasaaStatsGrid({ metrics }: { metrics: SasaaMetrics }) {
  const mslUnavailable = metrics.msl.averageScore === null;
  const latestMonthLabel =
    metrics.msl.latestMonth !== null && isMslMonth(metrics.msl.latestMonth)
      ? MSL_MONTH_LABELS[metrics.msl.latestMonth]
      : null;
  const categoryLabel = metrics.msl.category
    ? MSL_CATEGORY_LABELS[metrics.msl.category]
    : "Belum ada penilaian MSL";

  return (
    <section
      aria-label="Ringkasan data proyek"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatCard
        tone="msl"
        label="MSL"
        value={
          mslUnavailable
            ? "—"
            : decimalFormat.format(metrics.msl.averageScore ?? 0)
        }
        hint={categoryLabel}
        detail={
          mslUnavailable
            ? "Belum ada assessment MSL untuk proyek ini."
            : `${metrics.msl.assessedMonths} bulan dinilai${
                latestMonthLabel ? ` • terbaru ${latestMonthLabel}` : ""
              }`
        }
        unavailable={mslUnavailable}
      />
      <StatCard
        tone="engineering"
        label="Eng DB"
        value={numberFormat.format(metrics.engineeringDatabase.totalEntries)}
        hint={`${metrics.engineeringDatabase.categoriesCovered}/${metrics.engineeringDatabase.totalCategories} kategori terisi`}
        detail="Total entri Engineering Database proyek."
      />
      <StatCard
        tone="pdoc"
        label="PDOC"
        value={`${numberFormat.format(metrics.pdoc.completedWeeks)}/${numberFormat.format(metrics.pdoc.totalWeeks)}`}
        hint="Minggu terisi"
        detail={
          metrics.pdoc.year === null
            ? "Belum ada dokumentasi proyek."
            : `Tahun ${metrics.pdoc.year} • ${metrics.pdoc.documentedMonths} bulan terdokumentasi`
        }
      />
      <StatCard
        tone="knowledge"
        label="KM"
        value={numberFormat.format(metrics.knowledge.total)}
        hint="Total catatan"
        detail={`LL ${numberFormat.format(metrics.knowledge.lessonLearn)} • BP ${numberFormat.format(metrics.knowledge.bestPractice)} • VA/VE ${numberFormat.format(metrics.knowledge.vaVe)}`}
      />
    </section>
  );
}
