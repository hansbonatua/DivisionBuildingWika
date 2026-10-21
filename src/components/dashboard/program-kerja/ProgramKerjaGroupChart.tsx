"use client";

import type { ReactNode } from "react";
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
import type { SummaryGroupItem } from "@/lib/program-kerja/summary";

type UnitFilter = "Jumlah" | "Persentase" | null;

type JumlahDatum = {
  name: string;
  RA: number;
  RI: number;
  programCount: number;
};

type PersentaseDatum = {
  name: string;
  achievement: number;
  programCount: number;
};

const countFormatter = new Intl.NumberFormat("id-ID");
const percentFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

const RA_COLOR = "#001f3f";
const RI_COLOR = "#0061a5";

function chartHeight(groupCount: number): number {
  return Math.max(220, groupCount * 64);
}

function shortenGroupName(value: string): string {
  return value.length > 24 ? `${value.slice(0, 23)}…` : value;
}

function ChartEmptyState() {
  return (
    <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-outline/70 bg-slate-50 px-4 text-center">
      <p className="text-xs font-medium text-primary/50">
        Tidak ada data untuk ditampilkan.
      </p>
    </div>
  );
}

function GroupChartCard({
  eyebrow,
  subtitle,
  children,
}: {
  eyebrow: "Unit Jumlah" | "Unit Persentase";
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-lg border border-outline bg-surface p-5 shadow-sm">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">
          {eyebrow}
        </p>
        <p className="mt-0.5 text-sm font-bold text-primary">
          Pencapaian Program per Kelompok
        </p>
        <p className="mt-0.5 text-xs text-primary/50">{subtitle}</p>
      </div>
      <div className="mt-4 min-w-0">{children}</div>
    </div>
  );
}

type JumlahTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: JumlahDatum }>;
};

function JumlahTooltip({ active, payload }: JumlahTooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) {
    return null;
  }

  return (
    <div className="max-w-[280px] rounded-lg border border-outline/60 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-primary">{datum.name}</p>
      <p className="mt-1 text-xs text-primary/70">
        RA: {countFormatter.format(datum.RA)}
      </p>
      <p className="text-xs text-primary/70">
        RI: {countFormatter.format(datum.RI)}
      </p>
      <p className="mt-1 text-[11px] text-primary/50">
        {countFormatter.format(datum.programCount)} program
      </p>
    </div>
  );
}

type PersentaseTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: PersentaseDatum }>;
};

function PersentaseTooltip({ active, payload }: PersentaseTooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) {
    return null;
  }

  return (
    <div className="max-w-[280px] rounded-lg border border-outline/60 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-primary">{datum.name}</p>
      <p className="mt-1 text-xs text-primary/70">
        Pencapaian: {percentFormatter.format(datum.achievement)}%
      </p>
      <p className="mt-1 text-[11px] text-primary/50">
        {countFormatter.format(datum.programCount)} program
      </p>
    </div>
  );
}

function JumlahChart({ data }: { data: JumlahDatum[] }) {
  if (data.length === 0) {
    return <ChartEmptyState />;
  }

  return (
    <ResponsiveContainer width="100%" height={chartHeight(data.length)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 4, bottom: 0 }}
        barGap={4}
      >
        <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => countFormatter.format(value)}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          interval={0}
          tick={{ fontSize: 10, fill: "#334155" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: string) => shortenGroupName(value)}
        />
        <Tooltip content={<JumlahTooltip />} cursor={{ fill: "#f1f5f9" }} />
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
          barSize={12}
          radius={[0, 4, 4, 0]}
        />
        <Bar
          dataKey="RI"
          name="RI"
          fill={RI_COLOR}
          barSize={12}
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PersentaseChart({ data }: { data: PersentaseDatum[] }) {
  if (data.length === 0) {
    return <ChartEmptyState />;
  }

  return (
    <ResponsiveContainer width="100%" height={chartHeight(data.length)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 52, left: 4, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => `${percentFormatter.format(value)}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          interval={0}
          tick={{ fontSize: 10, fill: "#334155" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: string) => shortenGroupName(value)}
        />
        <Tooltip content={<PersentaseTooltip />} cursor={{ fill: "#f1f5f9" }} />
        <Bar
          dataKey="achievement"
          name="Pencapaian"
          fill={RI_COLOR}
          barSize={16}
          radius={[0, 4, 4, 0]}
        >
          <LabelList
            dataKey="achievement"
            position="right"
            fill="#001f3f"
            fontSize={10}
            fontWeight={600}
            formatter={(value) => `${percentFormatter.format(Number(value))}%`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function ProgramKerjaGroupChart({
  groups,
  unit,
}: {
  groups: SummaryGroupItem[];
  unit: UnitFilter;
}) {
  const jumlahData: JumlahDatum[] = groups.flatMap((group) =>
    group.jumlah
      ? [
          {
            name: group.groupName,
            RA: group.jumlah.totalRa,
            RI: group.jumlah.totalRi,
            programCount: group.programCount,
          },
        ]
      : [],
  );

  const persentaseData: PersentaseDatum[] = groups.flatMap((group) => {
    const achievement = group.persentase?.averageAchievement;
    if (achievement === null || achievement === undefined) {
      return [];
    }
    return [
      {
        name: group.groupName,
        achievement,
        programCount: group.programCount,
      },
    ];
  });

  if (unit === "Jumlah") {
    return (
      <GroupChartCard
        eyebrow="Unit Jumlah"
        subtitle="Perbandingan total RA dan RI per kelompok program."
      >
        <JumlahChart data={jumlahData} />
      </GroupChartCard>
    );
  }

  if (unit === "Persentase") {
    return (
      <GroupChartCard
        eyebrow="Unit Persentase"
        subtitle="Rata-rata pencapaian Program Kerja per kelompok."
      >
        <PersentaseChart data={persentaseData} />
      </GroupChartCard>
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      <GroupChartCard
        eyebrow="Unit Jumlah"
        subtitle="Perbandingan total RA dan RI per kelompok program."
      >
        <JumlahChart data={jumlahData} />
      </GroupChartCard>
      <GroupChartCard
        eyebrow="Unit Persentase"
        subtitle="Rata-rata pencapaian Program Kerja per kelompok."
      >
        <PersentaseChart data={persentaseData} />
      </GroupChartCard>
    </div>
  );
}
