"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SasaaEsgStatus } from "./types";

// Reusable 12-month bar chart for the SASAA dashboard.
//
// One bar per month, January first, always on the 0..maxY assessment scale so
// the six charts are visually comparable. When `colorByStatus` is on, the bar
// colour encodes the ESG cell state and a small legend explains it — the chart
// itself never decides the colour rule for MSL/PDOC data.

export type MonthlyBarDatum = {
  month: number;
  value: number;
  status?: SasaaEsgStatus | null;
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

const BAR_COLOR = "#0061a5";
const COMPLETE_COLOR = "#16a34a";
const HALF_COLOR = "#d97706";
const EMPTY_COLOR = "#cbd5e1";

const AXIS_TICK = { fontSize: 10, fill: "#64748b" };

const STATUS_LABELS: Record<SasaaEsgStatus, string> = {
  Complete: "Complete",
  Half: "Half",
};

type ChartDatum = {
  label: string;
  month: number;
  value: number;
  status: SasaaEsgStatus | null;
};

function barColor(datum: ChartDatum, colorByStatus: boolean): string {
  if (!colorByStatus) {
    return BAR_COLOR;
  }
  if (datum.status === "Complete") return COMPLETE_COLOR;
  if (datum.status === "Half") return HALF_COLOR;
  return EMPTY_COLOR;
}

type MonthlyTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartDatum }>;
};

function MonthlyTooltip({ active, payload }: MonthlyTooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) {
    return null;
  }

  return (
    <div className="rounded-lg border border-outline/60 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-primary">{datum.label}</p>
      <p className="mt-1 text-xs text-primary/70">
        Nilai: {datum.value.toFixed(2)}
      </p>
      {datum.status ? (
        <p className="text-xs font-semibold text-secondary">
          {STATUS_LABELS[datum.status]}
        </p>
      ) : null}
    </div>
  );
}

function ChartLegend() {
  return (
    <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-primary/60">
      <li className="flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: COMPLETE_COLOR }}
        />
        Complete
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: HALF_COLOR }}
        />
        Half
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: EMPTY_COLOR }}
        />
        Belum dinilai
      </li>
    </ul>
  );
}

export default function MonthlyBarChart({
  data,
  title,
  subtitle,
  maxY = 5,
  colorByStatus = false,
  height = 200,
}: {
  data: MonthlyBarDatum[];
  title: string;
  subtitle?: string;
  maxY?: number;
  colorByStatus?: boolean;
  height?: number;
}) {
  const chartData: ChartDatum[] = data.map((datum) => ({
    label: MONTH_LABELS[datum.month - 1] ?? `B${datum.month}`,
    month: datum.month,
    value: datum.value,
    status: datum.status ?? null,
  }));

  const ticks = Array.from({ length: maxY + 1 }, (_, index) => index);

  return (
    <section className="flex h-full flex-col rounded-2xl border border-outline/70 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-bold text-primary">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-primary/50">{subtitle}</p>
        ) : null}
      </div>

      {/* Text alternative: the plotted values stay available to screen readers
          (and to tests) even though the SVG bars are decorative. */}
      <p className="sr-only">
        {chartData
          .map((datum) => `${datum.label} ${datum.value.toFixed(2)}`)
          .join(", ")}
      </p>

      <div className="mt-4 min-w-0" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              domain={[0, maxY]}
              ticks={ticks}
              allowDecimals={false}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<MonthlyTooltip />} cursor={{ fill: "#f1f5f9" }} />
            <Bar dataKey="value" name={title} radius={[4, 4, 0, 0]} maxBarSize={28}>
              {chartData.map((datum) => (
                <Cell
                  key={`cell-${datum.month}`}
                  fill={barColor(datum, colorByStatus)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {colorByStatus ? <ChartLegend /> : null}
    </section>
  );
}
