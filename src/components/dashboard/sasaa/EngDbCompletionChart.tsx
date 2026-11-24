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
import type { SasaaEngDbStatus } from "./types";

// Completion of the Engineering Database for the selected Master Project.
//
// The SASAA payload only carries `charts.engDb` for the project currently being
// viewed, so this chart plots one bar (that project) instead of one bar per
// project: the per-project comparison would need data the frontend never loads.

const BAR_COLOR = "#0061a5";
const AXIS_TICK = { fontSize: 10, fill: "#64748b" };

type CompletionDatum = {
  name: string;
  percent: number;
  covered: number;
  total: number;
};

/** (available components / total components) × 100, clamped to 0..100. */
export function engDbCompletionPercent(covered: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const safeCovered = Number.isFinite(covered) ? Math.max(0, covered) : 0;
  return Math.round((Math.min(safeCovered, total) / total) * 100);
}

type CompletionTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: CompletionDatum }>;
};

function CompletionTooltip({ active, payload }: CompletionTooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) {
    return null;
  }

  return (
    <div className="rounded-lg border border-outline/60 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-primary">{datum.name}</p>
      <p className="mt-1 text-xs text-primary/70">
        {datum.covered} dari {datum.total} komponen
      </p>
      <p className="text-xs font-semibold text-secondary">{datum.percent}%</p>
    </div>
  );
}

export default function EngDbCompletionChart({
  projectName,
  engDb,
}: {
  projectName: string;
  engDb: SasaaEngDbStatus;
}) {
  const percent = engDbCompletionPercent(engDb.covered, engDb.total);
  const hasData = engDb.total > 0;
  const chartData: CompletionDatum[] = [
    {
      name: projectName,
      percent,
      covered: engDb.covered,
      total: engDb.total,
    },
  ];

  return (
    <section className="flex h-full flex-col rounded-2xl border border-outline/70 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-bold text-primary">
          Persentase Kelengkapan per Proyek
        </h2>
        <p className="mt-0.5 text-xs text-primary/50">
          Perbandingan komponen Engineering Database yang tersedia dari enam
          komponen per Master Project
        </p>
      </div>

      {!hasData ? (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-xl border border-dashed border-outline bg-background p-6">
          <p className="text-xs font-semibold text-primary/50">Belum ada data</p>
        </div>
      ) : (
        <>
          {/* Text alternative: the bar stays readable to screen readers even
              though the SVG itself is decorative. */}
          <p className="sr-only">
            {projectName}: {percent}% ({engDb.covered} dari {engDb.total}{" "}
            komponen)
          </p>

          <div className="mt-4 min-w-0" style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<CompletionTooltip />}
                  cursor={{ fill: "#f1f5f9" }}
                />
                <Bar
                  dataKey="percent"
                  name="Kelengkapan"
                  fill={BAR_COLOR}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={28}
                >
                  <LabelList
                    dataKey="percent"
                    position="right"
                    fill="#0061a5"
                    fontSize={11}
                    fontWeight={700}
                    formatter={(label) => `${label}%`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
