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
import type { EngineeringDatabaseProjectCompleteness } from "@/lib/engineering-database/summary";
import {
  formatEngineeringDatabaseCount,
  formatEngineeringDatabasePercentage,
} from "@/lib/engineering-database/summaryFormat";

// Chart 2 — completeness per Master Project.
// The denominator is always the six locked Engineering Database components, so
// a category with several records still counts once. Project order follows the
// Summary matrix (name/location/id); projects are never re-ranked by percentage.

const BAR_COLOR = "#001f3f";
const AXIS_TICK = { fontSize: 10, fill: "#64748b" };
const PROJECT_TICK = { fontSize: 10, fill: "#334155" };
const X_TICKS = [0, 25, 50, 75, 100];
const MAX_VISIBLE_HEIGHT = 560;

type CompletenessDatum = EngineeringDatabaseProjectCompleteness & {
  // Pre-composed label so the bar tip reads "<x>/6 komponen | <p>%".
  valueLabel: string;
};

function truncateName(value: string): string {
  return value.length > 28 ? `${value.slice(0, 27)}…` : value;
}

function chartHeight(rowCount: number): number {
  return Math.max(200, rowCount * 32 + 32);
}

type CompletenessTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: CompletenessDatum }>;
};

function CompletenessTooltip({ active, payload }: CompletenessTooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) {
    return null;
  }

  return (
    <div className="max-w-[300px] rounded-lg border border-outline/60 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-primary">{datum.name}</p>
      {datum.location.trim() !== "" ? (
        <p className="text-[11px] text-primary/50">{datum.location}</p>
      ) : null}
      <p className="mt-1 text-xs text-primary/70">
        {formatEngineeringDatabaseCount(datum.availableComponents)} dari{" "}
        {formatEngineeringDatabaseCount(datum.totalComponents)} komponen
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

export default function EngineeringDatabaseProjectCompletenessChart({
  rows,
}: {
  rows: EngineeringDatabaseProjectCompleteness[];
}) {
  const data: CompletenessDatum[] = rows.map((row) => ({
    ...row,
    valueLabel: `${formatEngineeringDatabaseCount(
      row.availableComponents,
    )}/${formatEngineeringDatabaseCount(
      row.totalComponents,
    )} komponen | ${formatEngineeringDatabasePercentage(row.percentage)}`,
  }));
  const height = chartHeight(data.length);
  const scrollable = height > MAX_VISIBLE_HEIGHT;

  return (
    <section
      aria-label="Persentase Kelengkapan per Proyek"
      className="min-w-0 rounded-lg border border-outline bg-surface p-5 shadow-sm"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-primary">
            Persentase Kelengkapan per Proyek
          </h2>
          <p className="mt-0.5 text-xs text-primary/50">
            Perbandingan komponen Engineering Database yang tersedia dari enam
            komponen per Master Project.
          </p>
        </div>
        {data.length > 0 ? (
          <span className="shrink-0 text-xs font-semibold text-primary/60">
            {formatEngineeringDatabaseCount(data.length)} proyek
          </span>
        ) : null}
      </div>

      {data.length === 0 ? (
        <ChartEmptyState />
      ) : (
        <div className="mt-4 min-w-0 overflow-x-auto">
          <div className="min-w-[480px]">
            <div className={scrollable ? "max-h-[560px] overflow-y-auto pr-1" : ""}>
              <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 4, right: 132, left: 0, bottom: 0 }}
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
                      dataKey="name"
                      width={184}
                      interval={0}
                      tick={PROJECT_TICK}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value: string) => truncateName(value)}
                    />
                    <Tooltip
                      content={<CompletenessTooltip />}
                      cursor={{ fill: "#f1f5f9" }}
                    />
                    {/* See Chart 1: the floor keeps "0/6 komponen | 0%"
                        labels rendered for projects with no data at all. */}
                    <Bar
                      dataKey="percentage"
                      name="Kelengkapan"
                      fill={BAR_COLOR}
                      barSize={14}
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
          </div>
        </div>
      )}
    </section>
  );
}
