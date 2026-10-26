"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EngineeringDatabaseCategoryCoverage } from "@/lib/engineering-database/summary";
import {
  formatEngineeringDatabaseCount,
  formatEngineeringDatabasePercentage,
} from "@/lib/engineering-database/summaryFormat";

// Chart 1 — availability per category.
// Bar length is the percentage of Master Projects that have at least one record
// in that category (project presence, never file count). The absolute
// "<n> proyek | <p>%" value is rendered beside every bar so the count is never
// hidden inside the tooltip.

const BAR_COLOR = "#0061a5";
const AXIS_TICK = { fontSize: 10, fill: "#64748b" };
const CATEGORY_TICK = { fontSize: 10, fill: "#334155" };
const X_TICKS = [0, 25, 50, 75, 100];

type CoverageDatum = EngineeringDatabaseCategoryCoverage & {
  // Pre-composed label so the bar tip reads "<n> proyek | <p>%".
  valueLabel: string;
};

function truncateLabel(value: string): string {
  return value.length > 30 ? `${value.slice(0, 29)}…` : value;
}

function chartHeight(rowCount: number): number {
  return Math.max(220, rowCount * 46 + 40);
}

type CoverageTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: CoverageDatum }>;
};

function CoverageTooltip({ active, payload }: CoverageTooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) {
    return null;
  }

  return (
    <div className="max-w-[300px] rounded-lg border border-outline/60 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-primary">{datum.label}</p>
      <p className="mt-1 text-xs text-primary/70">
        {formatEngineeringDatabaseCount(datum.projectCount)} dari{" "}
        {formatEngineeringDatabaseCount(datum.totalProjects)} proyek
      </p>
      <p className="text-xs font-semibold text-secondary">
        {formatEngineeringDatabasePercentage(datum.percentage)}
      </p>
    </div>
  );
}

function ChartEmptyState() {
  return (
    <div className="mt-4 flex h-52 items-center justify-center rounded-lg border border-dashed border-outline/70 bg-slate-50 px-4 text-center">
      <p className="text-xs font-medium text-primary/50">
        Belum ada Master Project untuk ditampilkan.
      </p>
    </div>
  );
}

export default function EngineeringDatabaseCategoryCoverageChart({
  rows,
}: {
  rows: EngineeringDatabaseCategoryCoverage[];
}) {
  const totalProjects = rows[0]?.totalProjects ?? 0;
  const data: CoverageDatum[] = rows.map((row) => ({
    ...row,
    valueLabel: `${formatEngineeringDatabaseCount(
      row.projectCount,
    )} proyek | ${formatEngineeringDatabasePercentage(row.percentage)}`,
  }));

  return (
    <section
      aria-label="Persentase Ketersediaan per Kategori"
      className="min-w-0 rounded-lg border border-outline bg-surface p-5 shadow-sm"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-primary">
            Persentase Ketersediaan per Kategori
          </h2>
          <p className="mt-0.5 text-xs text-primary/50">
            Jumlah Master Project yang sudah memiliki minimal satu data pada tiap
            kategori.
          </p>
        </div>
        {totalProjects > 0 ? (
          <span className="shrink-0 text-xs font-semibold text-primary/60">
            {formatEngineeringDatabaseCount(totalProjects)} Master Project
          </span>
        ) : null}
      </div>

      {totalProjects === 0 ? (
        <ChartEmptyState />
      ) : (
        <div className="mt-4 min-w-0 overflow-x-auto">
          <div className="min-w-[480px]" style={{ height: chartHeight(data.length) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 108, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  ticks={X_TICKS}
                  allowDecimals={false}
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={172}
                  interval={0}
                  tick={CATEGORY_TICK}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: string) => truncateLabel(value)}
                />
                <Tooltip
                  content={<CoverageTooltip />}
                  cursor={{ fill: "#f1f5f9" }}
                />
                {/* Recharts drops zero-width rects, which would also drop their
                    value labels. A 2px floor keeps "0 proyek | 0%" visible
                    without misrepresenting the percentage. */}
                <Bar
                  dataKey="percentage"
                  name="Ketersediaan"
                  fill={BAR_COLOR}
                  barSize={16}
                  minPointSize={2}
                  radius={[0, 4, 4, 0]}
                >
                  <LabelList
                    dataKey="valueLabel"
                    position="right"
                    fill="#334155"
                    fontSize={10}
                    fontWeight={600}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
