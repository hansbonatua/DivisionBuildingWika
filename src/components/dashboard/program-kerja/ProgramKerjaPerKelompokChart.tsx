"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SummaryProgramRow } from "@/lib/program-kerja/summary";
import { formatSummaryMonthlyValue } from "@/lib/program-kerja/summaryFormat";

type UnitSection = "Jumlah" | "Persentase";
type UnitFilter = UnitSection | null;

type ChartDatum = {
  id: string;
  name: string;
  unit: UnitSection;
  RA: number | null;
  RI: number | null;
};

type GroupBucket = {
  id: string;
  name: string;
  programs: SummaryProgramRow[];
};

const RA_COLOR = "#001f3f";
const RI_COLOR = "#0061a5";

const controlClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/40";

function truncateProgramName(value: string): string {
  return value.length > 34 ? `${value.slice(0, 33)}…` : value;
}

function chartHeight(programCount: number): number {
  return Math.max(180, programCount * 56);
}

function labelText(value: unknown, unit: UnitSection): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? formatSummaryMonthlyValue(numeric, unit) : "";
}

function groupBuckets(programs: SummaryProgramRow[]): GroupBucket[] {
  const buckets = new Map<string, GroupBucket>();
  for (const program of programs) {
    const id = program.group?.id ?? "__none__";
    const name = program.group?.name ?? "Tanpa Kelompok";
    const bucket = buckets.get(id);
    if (bucket) {
      bucket.programs.push(program);
    } else {
      buckets.set(id, { id, name, programs: [program] });
    }
  }
  return [...buckets.values()];
}

function chartDataFor(programs: SummaryProgramRow[], unit: UnitSection): ChartDatum[] {
  return programs.map((program) => ({
    id: program.id,
    name: program.name,
    unit,
    RA: program.chartMetrics.ra,
    RI: program.chartMetrics.riActualRunning,
  }));
}

type ChartTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartDatum }>;
  unit: UnitSection;
};

function ChartTooltip({ active, payload, unit }: ChartTooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) {
    return null;
  }
  const riLabel = unit === "Persentase" ? "RI Aktual Berjalan" : "RI";

  return (
    <div className="max-w-[320px] rounded-lg border border-outline/60 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-primary">{datum.name}</p>
      <p className="mt-1 text-[11px] text-primary/50">Unit: {unit}</p>
      <p className="mt-1 text-xs text-primary/70">
        RA: {formatSummaryMonthlyValue(datum.RA, unit)}
      </p>
      <p className="text-xs text-primary/70">
        {riLabel}:{" "}
        {datum.RI === null
          ? "Belum ada laporan"
          : formatSummaryMonthlyValue(datum.RI, unit)}
      </p>
    </div>
  );
}

function UnitChartCard({
  programs,
  unit,
}: {
  programs: SummaryProgramRow[];
  unit: UnitSection;
}) {
  const data = chartDataFor(programs, unit);
  const height = chartHeight(data.length);
  const scrollable = height > 640;

  return (
    <div className="rounded-lg border border-outline/70 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">
            Unit {unit}
          </p>
          <p className="mt-0.5 text-xs text-primary/50">
            Perbandingan RA dan {unit === "Persentase" ? "RI Aktual Berjalan" : "RI"} per
            Program Kerja.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-primary/50">
          {data.length} program
        </span>
      </div>

      <div className="mt-3 min-w-0 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className={scrollable ? "max-h-[640px] overflow-y-auto pr-1" : ""}>
            <div style={{ height }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 8, right: 64, left: 8, bottom: 0 }}
                  barGap={3}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    type="number"
                    allowDecimals={unit === "Persentase"}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: number) =>
                      formatSummaryMonthlyValue(value, unit)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={190}
                    interval={0}
                    tick={{ fontSize: 10, fill: "#334155" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: string) => truncateProgramName(value)}
                  />
                  <Tooltip
                    content={<ChartTooltip unit={unit} />}
                    cursor={{ fill: "#f1f5f9" }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    height={24}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Bar
                    dataKey="RA"
                    name="RA"
                    fill={RA_COLOR}
                    barSize={14}
                    radius={[0, 4, 4, 0]}
                  >
                    <LabelList
                      dataKey="RA"
                      position="right"
                      fill="#001f3f"
                      fontSize={10}
                      fontWeight={600}
                      formatter={(value) => labelText(value, unit)}
                    />
                  </Bar>
                  <Bar
                    dataKey="RI"
                    name="RI"
                    fill={RI_COLOR}
                    barSize={14}
                    radius={[0, 4, 4, 0]}
                  >
                    <LabelList
                      dataKey="RI"
                      position="right"
                      fill="#0061a5"
                      fontSize={10}
                      fontWeight={600}
                      formatter={(value) => labelText(value, unit)}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupCard({ group }: { group: GroupBucket }) {
  const jumlahPrograms = group.programs.filter((program) => program.unit === "Jumlah");
  const persentasePrograms = group.programs.filter(
    (program) => program.unit === "Persentase",
  );

  return (
    <div className="rounded-lg border border-outline bg-background/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wide text-primary">
            {group.name}
          </h3>
          <p className="mt-0.5 text-[11px] text-primary/50">
            {group.programs.length} Program Kerja
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {jumlahPrograms.length > 0 ? (
          <UnitChartCard programs={jumlahPrograms} unit="Jumlah" />
        ) : null}
        {persentasePrograms.length > 0 ? (
          <UnitChartCard programs={persentasePrograms} unit="Persentase" />
        ) : null}
      </div>
    </div>
  );
}

export default function ProgramKerjaPerKelompokChart({
  programs,
  groups,
  globalGroupId,
  unit,
}: {
  programs: SummaryProgramRow[];
  groups: Array<{ id: string; name: string }>;
  globalGroupId: string | null;
  unit: UnitFilter;
}) {
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const buckets = useMemo(() => groupBuckets(programs), [programs]);

  const options = useMemo(() => {
    if (globalGroupId === null) {
      return groups;
    }
    const match = groups.find((group) => group.id === globalGroupId);
    if (match) {
      return [match];
    }
    const bucket = buckets.find((item) => item.id === globalGroupId);
    return [{ id: globalGroupId, name: bucket?.name ?? "Kelompok Program" }];
  }, [buckets, globalGroupId, groups]);

  const candidateGroupId = globalGroupId ?? selectedGroupId;
  const effectiveGroupId =
    globalGroupId === null &&
    candidateGroupId !== "" &&
    !options.some((group) => group.id === candidateGroupId)
      ? ""
      : candidateGroupId;

  const visibleGroups =
    effectiveGroupId === ""
      ? buckets
      : buckets.filter((bucket) => bucket.id === effectiveGroupId);

  return (
    <section
      aria-label="Program Kerja per Kelompok"
      className="min-w-0 rounded-lg border border-outline bg-surface p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">
            Visualisasi Program Kerja
          </p>
          <h2 className="mt-0.5 text-sm font-bold text-primary">
            Program Kerja per Kelompok
          </h2>
          <p className="mt-0.5 text-xs text-primary/50">
            {unit === null
              ? "Perbandingan RA dan RI untuk setiap Program Kerja pada kelompok terpilih."
              : `Perbandingan RA dan ${
                  unit === "Persentase" ? "RI Aktual Berjalan" : "RI"
                } untuk setiap Program Kerja unit ${unit}.`}
          </p>
        </div>

        <label className="flex w-full min-w-0 flex-col gap-1.5 lg:w-72">
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary/50">
            Kelompok Program Kerja
          </span>
          <select
            value={effectiveGroupId}
            onChange={(event) => setSelectedGroupId(event.target.value)}
            disabled={globalGroupId !== null}
            aria-label="Filter Kelompok pada grafik Program Kerja"
            className={controlClass}
          >
            {globalGroupId === null ? (
              <option value="">Semua Kelompok</option>
            ) : null}
            {options.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {globalGroupId !== null ? (
            <span className="text-[11px] text-primary/45">
              Mengikuti filter Kelompok Program global.
            </span>
          ) : null}
        </label>
      </div>

      <div className="mt-5 space-y-4">
        {visibleGroups.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-outline/70 bg-slate-50 px-4 text-center">
            <p className="text-xs font-medium text-primary/50">
              Tidak ada Program Kerja pada kelompok ini.
            </p>
          </div>
        ) : (
          visibleGroups.map((group) => <GroupCard key={group.id} group={group} />)
        )}
      </div>
    </section>
  );
}
