"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type {
  ProgramKerjaStatus,
  SummaryStatusDistribution,
} from "@/lib/program-kerja/summary";

const STATUS_ITEMS: ReadonlyArray<{
  key: keyof SummaryStatusDistribution;
  label: ProgramKerjaStatus;
  color: string;
}> = [
  { key: "belumMulai", label: "Belum Mulai", color: "#94a3b8" },
  { key: "berjalan", label: "Berjalan", color: "#2563eb" },
  { key: "tercapai", label: "Tercapai", color: "#16a34a" },
  { key: "overTarget", label: "Over Target", color: "#d97706" },
];

const countFormatter = new Intl.NumberFormat("id-ID");
const percentFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

type StatusDatum = {
  name: string;
  value: number;
  color: string;
};

type StatusTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: StatusDatum }>;
  total: number;
};

function StatusTooltip({ active, payload, total }: StatusTooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) {
    return null;
  }
  const percent = total > 0 ? (datum.value / total) * 100 : 0;

  return (
    <div className="rounded-lg border border-outline/60 bg-white px-3 py-2 shadow-lg">
      <p className="flex items-center gap-2 text-xs font-bold text-primary">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: datum.color }}
        />
        {datum.name}
      </p>
      <p className="mt-1 text-xs text-primary/70">
        {countFormatter.format(datum.value)} program
      </p>
      <p className="text-xs text-primary/70">
        {percentFormatter.format(percent)}% dari total
      </p>
    </div>
  );
}

function ChartEmptyState() {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-outline/70 bg-slate-50 px-4 text-center">
      <p className="text-xs font-medium text-primary/50">
        Tidak ada data untuk ditampilkan.
      </p>
    </div>
  );
}

export default function ProgramKerjaStatusChart({
  distribution,
  totalPrograms,
}: {
  distribution: SummaryStatusDistribution;
  totalPrograms: number;
}) {
  const items = STATUS_ITEMS.map((item) => ({
    ...item,
    value: distribution[item.key],
  }));
  const data: StatusDatum[] = items.map((item) => ({
    name: item.label,
    value: item.value,
    color: item.color,
  }));

  return (
    <div className="flex h-full min-w-0 flex-col rounded-lg border border-outline bg-surface p-5 shadow-sm">
      <div>
        <p className="text-sm font-bold text-primary">Status Program Kerja</p>
        <p className="mt-0.5 text-xs text-primary/50">
          Distribusi status berdasarkan pencapaian program.
        </p>
      </div>

      {totalPrograms > 0 ? (
        <>
          <div className="relative mt-4 h-60 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={2}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {data.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip content={<StatusTooltip total={totalPrograms} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tracking-tight text-primary">
                {countFormatter.format(totalPrograms)}
              </span>
              <span className="text-[11px] font-medium text-primary/50">program</span>
            </div>
          </div>

          <ul className="mt-4 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
            {items.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="flex min-w-0 items-center gap-2 text-primary/70">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 font-semibold text-primary">
                  — {countFormatter.format(item.value)} program
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-4">
          <ChartEmptyState />
        </div>
      )}
    </div>
  );
}
