"use client";

import { useState } from "react";
import MonthlyBarChart from "./MonthlyBarChart";
import type { SasaaEngDbStatus, SasaaMslMonths } from "./types";

// MSL block: one chart whose series is chosen by the segmented control, plus
// the Engineering Database coverage status. The control only swaps this chart;
// the per-component MSL charts were removed from the page, so this section is
// now the single place where each component's monthly series is shown.

type ComponentKey = "total" | "engineeringValue" | "metodeKerja" | "engineeringExecution";

const COMPONENT_OPTIONS: ReadonlyArray<{ key: ComponentKey; label: string }> = [
  { key: "total", label: "Total" },
  { key: "engineeringValue", label: "Engineering Value" },
  { key: "metodeKerja", label: "Metode Kerja" },
  { key: "engineeringExecution", label: "Eng Execution" },
];

// Mirrors ENGINEERING_DATABASE_CATEGORY_LABELS on the server. Duplicated on
// purpose: importing @/lib/engineering-database/access would pull server-side
// permission code into the client bundle.
const ENG_DB_LABELS: Record<string, string> = {
  ENGINEERING_DRAWING: "Engineering Drawing",
  ENGINEERING_DESIGN_REPORT: "Engineering Design Report",
  METODE_PELAKSANAAN_PEKERJAAN: "Metode Pelaksanaan Pekerjaan",
  SPESIFIKASI_TEKNIS: "Spesifikasi Teknis",
  PROJECT_MASTER_SCHEDULE: "Project Master Schedule",
  BIM: "BIM",
};

function categoryLabel(category: string): string {
  return ENG_DB_LABELS[category] ?? category.replace(/_/g, " ");
}

export default function MslSection({
  msl,
  engDb,
}: {
  msl: SasaaMslMonths[];
  engDb: SasaaEngDbStatus;
}) {
  const [selected, setSelected] = useState<ComponentKey>("total");

  const selectedLabel =
    COMPONENT_OPTIONS.find((option) => option.key === selected)?.label ?? "Total";
  const data = msl.map((month, index) => ({
    month: index + 1,
    value: month[selected],
  }));

  const covered = engDb.categories.filter((entry) => entry.covered);

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="Pilih komponen MSL"
        className="flex flex-wrap gap-1 rounded-xl border border-outline/70 bg-background p-1"
      >
        {COMPONENT_OPTIONS.map((option) => {
          const active = option.key === selected;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(option.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                active
                  ? "bg-secondary text-white shadow-sm"
                  : "text-primary/60 hover:bg-white hover:text-primary"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <MonthlyBarChart
        data={data}
        title={`Skor MSL — ${selectedLabel}`}
        subtitle="Skala 0–5 · rata-rata tiga komponen untuk Total"
        height={200}
      />

      <section
        aria-label="Status Engineering Database"
        className="rounded-2xl border border-outline/70 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-primary">Engineering Database</h2>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            {engDb.covered}/{engDb.total} ✅
          </span>
        </div>
        {covered.length === 0 ? (
          <p className="mt-2 text-xs text-primary/50">
            Belum ada kategori Engineering Database yang terisi.
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {covered.map((entry) => (
              <li
                key={entry.category}
                className="rounded-full border border-outline/70 bg-background px-2.5 py-1 text-[11px] font-semibold text-primary/70"
              >
                {categoryLabel(entry.category)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
