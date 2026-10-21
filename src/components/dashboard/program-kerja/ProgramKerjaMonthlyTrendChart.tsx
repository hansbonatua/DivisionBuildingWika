"use client";

import type { ReactNode } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SummaryAggregate } from "@/lib/program-kerja/summary";

type UnitFilter = "Jumlah" | "Persentase";
type MonthlyData = SummaryAggregate["monthly"];

type MonthlyDatum = {
  label: string;
  RA: number | null;
  RI: number | null;
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
];

const countFormatter = new Intl.NumberFormat("id-ID");
const percentFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

const RA_COLOR = "#001f3f";
const RI_COLOR = "#0061a5";

function monthLabel(month: number): string {
  return MONTH_LABELS[month - 1] ?? String(month);
}

function formatValue(value: number | null, unit: UnitFilter): string {
  if (value === null) {
    return "—";
  }
  return unit === "Jumlah"
    ? countFormatter.format(value)
    : `${percentFormatter.format(value)}%`;
}

function TrendEmptyState() {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-outline/70 bg-slate-50 px-4 text-center">
      <p className="text-xs font-medium text-primary/50">
        Tidak ada data untuk ditampilkan.
      </p>
    </div>
  );
}

function TrendChartCard({
  eyebrow,
  children,
}: {
  eyebrow: "Unit Jumlah" | "Unit Persentase";
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-lg border border-outline bg-surface p-5 shadow-sm">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">
          {eyebrow}
        </p>
        <p className="mt-0.5 text-sm font-bold text-primary">Tren Capaian Bulanan</p>
        <p className="mt-0.5 text-xs text-primary/50">
          Perbandingan RA dan RI Program Kerja dari Januari sampai Desember.
        </p>
      </div>
      <div className="mt-4 min-w-0">{children}</div>
    </div>
  );
}

type MonthlyTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: MonthlyDatum }>;
  unit: UnitFilter;
};

function MonthlyTooltip({ active, payload, unit }: MonthlyTooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) {
    return null;
  }

  return (
    <div className="rounded-lg border border-outline/60 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-primary">{datum.label}</p>
      <p className="mt-1 text-xs text-primary/70">
        RA: {formatValue(datum.RA, unit)}
      </p>
      <p className="text-xs text-primary/70">
        RI: {datum.RI === null ? "Belum ada laporan" : formatValue(datum.RI, unit)}
      </p>
    </div>
  );
}

function buildMonthlyData(
  rows: Array<{ month: number; ra: number | null; ri: number | null }>,
): MonthlyDatum[] {
  return rows.map((row) => ({
    label: monthLabel(row.month),
    RA: row.ra,
    RI: row.ri,
  }));
}

function MonthlyLineChart({
  data,
  unit,
  totalPrograms,
}: {
  data: MonthlyDatum[];
  unit: UnitFilter;
  totalPrograms: number;
}) {
  if (totalPrograms === 0 || data.length === 0) {
    return <TrendEmptyState />;
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart
        data={data}
        margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
      >
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          interval={0}
          tick={{ fontSize: 9, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          width={48}
          allowDecimals={unit === "Persentase"}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) =>
            unit === "Jumlah"
              ? countFormatter.format(value)
              : `${percentFormatter.format(value)}%`
          }
        />
        <Tooltip
          content={<MonthlyTooltip unit={unit} />}
          cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={24}
          iconType="plainline"
          iconSize={12}
          wrapperStyle={{ fontSize: 11 }}
        />
        <Line
          type="monotone"
          dataKey="RA"
          name="RA"
          stroke={RA_COLOR}
          strokeWidth={2}
          dot={{ r: 2.5 }}
          activeDot={{ r: 4 }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="RI"
          name="RI"
          stroke={RI_COLOR}
          strokeWidth={2}
          dot={{ r: 2.5 }}
          activeDot={{ r: 4 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function ProgramKerjaMonthlyTrendChart({
  monthly,
  unit,
  totalPrograms,
}: {
  monthly: MonthlyData;
  unit: UnitFilter | null;
  totalPrograms: number;
}) {
  const jumlahData = buildMonthlyData(monthly.jumlah);
  const persentaseData = buildMonthlyData(monthly.persentase);

  if (unit === "Jumlah") {
    return (
      <TrendChartCard eyebrow="Unit Jumlah">
        <MonthlyLineChart
          data={jumlahData}
          unit="Jumlah"
          totalPrograms={totalPrograms}
        />
      </TrendChartCard>
    );
  }

  if (unit === "Persentase") {
    return (
      <TrendChartCard eyebrow="Unit Persentase">
        <MonthlyLineChart
          data={persentaseData}
          unit="Persentase"
          totalPrograms={totalPrograms}
        />
      </TrendChartCard>
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      <TrendChartCard eyebrow="Unit Jumlah">
        <MonthlyLineChart
          data={jumlahData}
          unit="Jumlah"
          totalPrograms={totalPrograms}
        />
      </TrendChartCard>
      <TrendChartCard eyebrow="Unit Persentase">
        <MonthlyLineChart
          data={persentaseData}
          unit="Persentase"
          totalPrograms={totalPrograms}
        />
      </TrendChartCard>
    </div>
  );
}
