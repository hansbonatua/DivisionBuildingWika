"use client";

import type { ReactNode } from "react";
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
import type { SummaryPicItem } from "@/lib/program-kerja/summary";

type UnitFilter = "Jumlah" | "Persentase" | null;

type PicDatum = {
  id: string;
  name: string;
  programCount: number;
  achievement: number;
};

type PicUnrated = {
  id: string;
  name: string;
  programCount: number;
  achievement: null;
};

const countFormatter = new Intl.NumberFormat("id-ID");
const percentFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

const PIC_COLOR = "#0061a5";

function chartHeight(picCount: number): number {
  return Math.max(300, picCount * 56);
}

function shortenPicName(value: string): string {
  return value.length > 20 ? `${value.slice(0, 19)}…` : value;
}

function PicEmptyState() {
  return (
    <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-outline/70 bg-slate-50 px-4 text-center">
      <p className="text-xs font-medium text-primary/50">
        Tidak ada data PIC untuk ditampilkan.
      </p>
    </div>
  );
}

function PicChartCard({
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
        <p className="mt-0.5 text-sm font-bold text-primary">
          Pencapaian Program per PIC
        </p>
        <p className="mt-0.5 text-xs text-primary/50">
          Rata-rata pencapaian Program Kerja berdasarkan PIC.
        </p>
      </div>
      <div className="mt-4 min-w-0">{children}</div>
    </div>
  );
}

type PicTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: PicDatum }>;
};

function PicTooltip({ active, payload }: PicTooltipProps) {
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

function UnratedPicList({ items }: { items: PicUnrated[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-outline/70 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold text-primary/60">
        PIC dengan pencapaian belum terhitung
      </p>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 text-[11px] text-primary/60"
          >
            <span className="truncate">{item.name}</span>
            <span className="shrink-0 font-semibold text-primary/70">
              — · {countFormatter.format(item.programCount)} program
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PicChartBody({
  pics,
  unit,
}: {
  pics: SummaryPicItem[];
  unit: "Jumlah" | "Persentase";
}) {
  const unitPics = pics.flatMap((pic) => {
    const metric = unit === "Jumlah" ? pic.jumlah : pic.persentase;
    if (!metric) {
      return [];
    }
    return [
      {
        id: pic.picId,
        name: pic.picName,
        programCount: pic.programCount,
        achievement: metric.averageAchievement,
      },
    ];
  });

  const data = unitPics.filter(
    (pic): pic is PicDatum => pic.achievement !== null,
  );
  const unrated = unitPics.filter(
    (pic): pic is PicUnrated => pic.achievement === null,
  );

  if (data.length === 0) {
    return (
      <>
        <PicEmptyState />
        <UnratedPicList items={unrated} />
      </>
    );
  }

  return (
    <>
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
            width={140}
            interval={0}
            tick={{ fontSize: 10, fill: "#334155" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: string) => shortenPicName(value)}
          />
          <Tooltip content={<PicTooltip />} cursor={{ fill: "#f1f5f9" }} />
          <Bar
            dataKey="achievement"
            name="Pencapaian"
            fill={PIC_COLOR}
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
      <UnratedPicList items={unrated} />
    </>
  );
}

export default function ProgramKerjaPicChart({
  pics,
  unit,
}: {
  pics: SummaryPicItem[];
  unit: UnitFilter;
}) {
  if (unit === "Jumlah") {
    return (
      <PicChartCard eyebrow="Unit Jumlah">
        <PicChartBody pics={pics} unit="Jumlah" />
      </PicChartCard>
    );
  }

  if (unit === "Persentase") {
    return (
      <PicChartCard eyebrow="Unit Persentase">
        <PicChartBody pics={pics} unit="Persentase" />
      </PicChartCard>
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      <PicChartCard eyebrow="Unit Jumlah">
        <PicChartBody pics={pics} unit="Jumlah" />
      </PicChartCard>
      <PicChartCard eyebrow="Unit Persentase">
        <PicChartBody pics={pics} unit="Persentase" />
      </PicChartCard>
    </div>
  );
}
