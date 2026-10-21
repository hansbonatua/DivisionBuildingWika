import { jsPDF } from "jspdf";
import autoTable, {
  type CellInput,
  type Styles,
  type UserOptions,
} from "jspdf-autotable";
import type {
  SummaryAggregate,
  SummaryGroupItem,
  SummaryPicItem,
  SummaryProgramRow,
} from "@/lib/program-kerja/summary";
import {
  SUMMARY_MONTH_SHORT,
  formatSummaryAchievement,
  formatSummaryCount,
  formatSummaryMonthlyValue,
  formatSummaryPeriod,
} from "@/lib/program-kerja/summaryFormat";

export type ProgramKerjaSummaryPdfMeta = {
  year: string;
  groupName: string;
  unit: string;
  picName: string;
};

const MARGIN = 12;
const NAVY_FILL: [number, number, number] = [30, 58, 95];
const SLATE_TEXT: [number, number, number] = [51, 65, 85];
const MUTED_TEXT: [number, number, number] = [100, 116, 139];
const BORDER_COLOR: [number, number, number] = [226, 232, 240];
const STRIPE_FILL: [number, number, number] = [248, 250, 252];

const STATUS_ITEMS: ReadonlyArray<{
  key: keyof SummaryAggregate["statusDistribution"];
  label: string;
  fill: [number, number, number];
  text: [number, number, number];
}> = [
  { key: "belumMulai", label: "Belum Mulai", fill: [248, 250, 252], text: [71, 85, 105] },
  { key: "berjalan", label: "Berjalan", fill: [239, 246, 255], text: [29, 78, 216] },
  { key: "tercapai", label: "Tercapai", fill: [236, 253, 245], text: [4, 120, 87] },
  { key: "overTarget", label: "Over Target", fill: [255, 251, 235], text: [180, 83, 9] },
];

type UnitSection = "Jumlah" | "Persentase";
type AutoTableDocument = jsPDF & {
  lastAutoTable?: { finalY?: number };
};

const baseStyles: Partial<Styles> = {
  font: "helvetica",
  fontSize: 7.5,
  cellPadding: 2,
  textColor: SLATE_TEXT,
  lineColor: BORDER_COLOR,
  lineWidth: 0.1,
  overflow: "linebreak",
  valign: "middle",
};

const headStyles: Partial<Styles> = {
  fillColor: NAVY_FILL,
  textColor: 255,
  fontStyle: "bold",
  fontSize: 7.5,
};

function filterLine(meta: ProgramKerjaSummaryPdfMeta): string {
  return [
    `Tahun: ${meta.year || "Semua"}`,
    `Kelompok: ${meta.groupName || "Semua"}`,
    `Unit: ${meta.unit || "Semua"}`,
    `PIC: ${meta.picName || "Semua"}`,
  ].join("  |  ");
}

function exportStamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function exportFileName(year: string, now: Date = new Date()): string {
  const stamp = exportStamp(now);
  return year
    ? `Summary-Program-Kerja-${year}-${stamp}.pdf`
    : `Summary-Program-Kerja-${stamp}.pdf`;
}

function selectedUnits(meta: ProgramKerjaSummaryPdfMeta): UnitSection[] {
  if (meta.unit === "Jumlah" || meta.unit === "Persentase") {
    return [meta.unit];
  }
  return ["Jumlah", "Persentase"];
}

function shareText(part: number, total: number): string {
  const percent = total > 0 ? (part / total) * 100 : 0;
  return formatSummaryAchievement(percent);
}

function currentY(doc: jsPDF, fallback: number): number {
  const finalY = (doc as AutoTableDocument).lastAutoTable?.finalY;
  return typeof finalY === "number" ? finalY : fallback;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 16) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  const nextY = ensureSpace(doc, y, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY_FILL);
  doc.text(title, MARGIN, nextY);
  doc.setDrawColor(0, 97, 165);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, nextY + 1.8, MARGIN + 12, nextY + 1.8);
  doc.setTextColor(0);
  return nextY + 7;
}

function drawSubheading(doc: jsPDF, title: string, y: number): number {
  const nextY = ensureSpace(doc, y, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 97, 165);
  doc.text(title, MARGIN, nextY);
  doc.setTextColor(0);
  return nextY + 3.5;
}

function drawTable(doc: jsPDF, options: UserOptions, fallbackY: number): number {
  autoTable(doc, options);
  return currentY(doc, fallbackY);
}

function emptyRow(columns: number, message: string): CellInput[] {
  return [
    {
      content: message,
      colSpan: columns,
      styles: { halign: "center", textColor: MUTED_TEXT, fontStyle: "normal" },
    },
  ];
}

function kpiValue(
  summary: SummaryAggregate,
  meta: ProgramKerjaSummaryPdfMeta,
): string {
  if (meta.unit === "Jumlah") {
    return `${formatSummaryAchievement(summary.kpis.averageAchievement.jumlah)}\nUnit Jumlah`;
  }
  if (meta.unit === "Persentase") {
    return `${formatSummaryAchievement(summary.kpis.averageAchievement.persentase)}\nUnit Persentase`;
  }
  return [
    `Jumlah: ${formatSummaryAchievement(summary.kpis.averageAchievement.jumlah)}`,
    `Persentase: ${formatSummaryAchievement(summary.kpis.averageAchievement.persentase)}`,
  ].join("\n");
}

function drawKpiSection(
  doc: jsPDF,
  summary: SummaryAggregate,
  meta: ProgramKerjaSummaryPdfMeta,
  y: number,
): number {
  const { kpis } = summary;
  const sectionY = drawSectionTitle(doc, "Ringkasan KPI", y);
  const body: CellInput[][] = [
    [
      `${formatSummaryCount(kpis.totalPrograms)} program`,
      `${formatSummaryCount(kpis.programsWithRi)} program\n${shareText(kpis.programsWithRi, kpis.totalPrograms)} dari total`,
      `${formatSummaryCount(kpis.programsWithoutRi)} program\n${shareText(kpis.programsWithoutRi, kpis.totalPrograms)} dari total`,
      kpiValue(summary, meta),
    ],
  ];

  return drawTable(
    doc,
    {
      startY: sectionY,
      head: [
        [
          "Total Program Kerja",
          "Program dengan RI",
          "Program Belum Ada RI",
          "Rata-Rata Pencapaian",
        ],
      ],
      body,
      theme: "grid",
      styles: { ...baseStyles, fontSize: 8, halign: "center" },
      headStyles: { ...headStyles, halign: "center" },
      bodyStyles: { fontStyle: "bold", minCellHeight: 14, valign: "middle" },
      alternateRowStyles: { fillColor: false },
      margin: { left: MARGIN, right: MARGIN, bottom: 16 },
    },
    sectionY,
  ) + 7;
}

function drawStatusSection(
  doc: jsPDF,
  summary: SummaryAggregate,
  y: number,
): number {
  const sectionY = drawSectionTitle(doc, "Distribusi Status", y);
  const total = summary.kpis.totalPrograms;
  const body: CellInput[][] = STATUS_ITEMS.map((item) => {
    const count = summary.statusDistribution[item.key];
    return [
      {
        content: item.label,
        styles: {
          fillColor: item.fill,
          textColor: item.text,
          fontStyle: "bold",
        },
      },
      { content: formatSummaryCount(count), styles: { halign: "right" } },
      { content: shareText(count, total), styles: { halign: "right" } },
    ];
  });

  return drawTable(
    doc,
    {
      startY: sectionY,
      head: [["Status", "Jumlah Program", "Persentase"]],
      body: body.length > 0 ? body : [emptyRow(3, "Tidak ada data untuk filter yang dipilih.")],
      theme: "grid",
      styles: baseStyles,
      headStyles,
      alternateRowStyles: { fillColor: false },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
      },
      margin: { left: MARGIN, right: MARGIN, bottom: 16 },
    },
    sectionY,
  ) + 7;
}

function groupJumlahRows(groups: SummaryGroupItem[]): CellInput[][] {
  if (groups.length === 0) {
    return [emptyRow(5, "Tidak ada data untuk filter yang dipilih.")];
  }
  return groups.map((group) => [
    group.groupName,
    { content: formatSummaryCount(group.programCount), styles: { halign: "right" } },
    {
      content: group.jumlah ? formatSummaryCount(group.jumlah.totalRa) : "—",
      styles: { halign: "right" },
    },
    {
      content: group.jumlah ? formatSummaryCount(group.jumlah.totalRi) : "—",
      styles: { halign: "right" },
    },
    {
      content: formatSummaryAchievement(group.jumlah?.averageAchievement ?? null),
      styles: { halign: "right" },
    },
  ]);
}

function groupPersentaseRows(groups: SummaryGroupItem[]): CellInput[][] {
  if (groups.length === 0) {
    return [emptyRow(3, "Tidak ada data untuk filter yang dipilih.")];
  }
  return groups.map((group) => [
    group.groupName,
    { content: formatSummaryCount(group.programCount), styles: { halign: "right" } },
    {
      content: formatSummaryAchievement(group.persentase?.averageAchievement ?? null),
      styles: { halign: "right" },
    },
  ]);
}

function drawGroupSection(
  doc: jsPDF,
  summary: SummaryAggregate,
  units: UnitSection[],
  y: number,
): number {
  let nextY = drawSectionTitle(doc, "Pencapaian per Kelompok", y);

  for (const unit of units) {
    if (units.length > 1) {
      nextY = drawSubheading(doc, `Unit ${unit}`, nextY);
    }
    const isJumlah = unit === "Jumlah";
    nextY = drawTable(
      doc,
      {
        startY: nextY,
        head: [
          isJumlah
            ? ["Kelompok", "Program", "Total RA", "Total RI", "Rata-Rata Pencapaian"]
            : ["Kelompok", "Program", "Rata-Rata Pencapaian"],
        ],
        body: isJumlah
          ? groupJumlahRows(summary.groups)
          : groupPersentaseRows(summary.groups),
        theme: "grid",
        styles: baseStyles,
        headStyles,
        alternateRowStyles: { fillColor: STRIPE_FILL },
        margin: { left: MARGIN, right: MARGIN, bottom: 16 },
      },
      nextY,
    ) + (units.length > 1 ? 4 : 0);
  }

  return nextY + 3;
}

function picRows(pics: SummaryPicItem[], unit: UnitSection): CellInput[][] {
  if (pics.length === 0) {
    return [emptyRow(3, "Tidak ada data PIC untuk filter yang dipilih.")];
  }
  return pics.map((pic) => {
    const metric = unit === "Jumlah" ? pic.jumlah : pic.persentase;
    return [
      pic.picName,
      { content: formatSummaryCount(pic.programCount), styles: { halign: "right" } },
      {
        content: formatSummaryAchievement(metric?.averageAchievement ?? null),
        styles: { halign: "right" },
      },
    ];
  });
}

function drawPicSection(
  doc: jsPDF,
  summary: SummaryAggregate,
  units: UnitSection[],
  y: number,
): number {
  let nextY = drawSectionTitle(doc, "Pencapaian per PIC", y);

  for (const unit of units) {
    if (units.length > 1) {
      nextY = drawSubheading(doc, `Unit ${unit}`, nextY);
    }
    nextY = drawTable(
      doc,
      {
        startY: nextY,
        head: [["PIC", "Program", "Rata-Rata Pencapaian"]],
        body: picRows(summary.pics, unit),
        theme: "grid",
        styles: baseStyles,
        headStyles,
        alternateRowStyles: { fillColor: STRIPE_FILL },
        margin: { left: MARGIN, right: MARGIN, bottom: 16 },
      },
      nextY,
    ) + (units.length > 1 ? 4 : 0);
  }

  return nextY + 3;
}

function monthlyRows(
  summary: SummaryAggregate,
  unit: UnitSection,
): CellInput[][] {
  const rows =
    unit === "Jumlah" ? summary.monthly.jumlah : summary.monthly.persentase;
  if (rows.length === 0) {
    return [emptyRow(3, "Tidak ada data bulanan untuk filter yang dipilih.")];
  }
  return rows.map((row) => [
    SUMMARY_MONTH_SHORT[row.month - 1] ?? String(row.month),
    {
      content: formatSummaryMonthlyValue(row.ra, unit),
      styles: { halign: "right" },
    },
    {
      content: formatSummaryMonthlyValue(row.ri, unit),
      styles: { halign: "right" },
    },
  ]);
}

function drawMonthlySection(
  doc: jsPDF,
  summary: SummaryAggregate,
  units: UnitSection[],
  y: number,
): number {
  let nextY = drawSectionTitle(doc, "Tren Capaian Bulanan", y);

  for (const unit of units) {
    if (units.length > 1) {
      nextY = drawSubheading(doc, `Unit ${unit}`, nextY);
    }
    nextY = drawTable(
      doc,
      {
        startY: nextY,
        head: [["Bulan", "RA", "RI"]],
        body: monthlyRows(summary, unit),
        theme: "grid",
        styles: baseStyles,
        headStyles,
        alternateRowStyles: { fillColor: STRIPE_FILL },
        tableWidth: 200,
        columnStyles: {
          1: { halign: "right" },
          2: { halign: "right" },
        },
        margin: { left: MARGIN, right: MARGIN, bottom: 16 },
      },
      nextY,
    ) + (units.length > 1 ? 4 : 0);
  }

  return nextY + 3;
}

function programRows(programs: SummaryProgramRow[]): CellInput[][] {
  if (programs.length === 0) {
    return [emptyRow(7, "Tidak ada Program Kerja untuk filter yang dipilih.")];
  }
  return programs.map((program) => [
    program.name,
    program.group?.name ?? "Tanpa Kelompok",
    program.unit,
    formatSummaryPeriod(program.startMonth, program.endMonth),
    program.pics.map((pic) => pic.name).join("\n") || "—",
    formatSummaryAchievement(program.achievement),
    program.status,
  ]);
}

function drawProgramTableSection(
  doc: jsPDF,
  summary: SummaryAggregate,
  y: number,
): number {
  const sectionY = drawSectionTitle(doc, "Daftar Program Kerja", y);
  return drawTable(
    doc,
    {
      startY: sectionY,
      head: [
        [
          "Program Kerja",
          "Kelompok",
          "Unit",
          "Periode",
          "PIC",
          "Pencapaian",
          "Status",
        ],
      ],
      body: programRows(summary.programs),
      theme: "grid",
      styles: { ...baseStyles, fontSize: 7, valign: "top" },
      headStyles,
      alternateRowStyles: { fillColor: STRIPE_FILL },
      columnStyles: {
        0: { cellWidth: 95, fontStyle: "bold" },
        1: { cellWidth: 60 },
        2: { cellWidth: 24 },
        3: { cellWidth: 50 },
        4: { cellWidth: 85 },
        5: { cellWidth: 42, halign: "right", fontStyle: "bold" },
        6: { cellWidth: 40 },
      },
      margin: { left: MARGIN, right: MARGIN, bottom: 16 },
      showHead: "everyPage",
    },
    sectionY,
  );
}

function addPageNumbers(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED_TEXT);
    doc.text("Summary Report Program Kerja", MARGIN, pageHeight - 7);
    const label = `Halaman ${page} / ${total}`;
    doc.text(label, pageWidth - MARGIN - doc.getTextWidth(label), pageHeight - 7);
  }
  doc.setTextColor(0);
}

export function buildProgramKerjaSummaryPdf(
  summary: SummaryAggregate,
  meta: ProgramKerjaSummaryPdfMeta,
  now: Date = new Date(),
  logoDataUrl: string | null = null,
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setProperties({
    title: "Summary Report Program Kerja",
    subject: "Program Kerja Engineering",
    author: "WIBEX",
  });

  if (logoDataUrl) {
    try {
      const logoWidth = 48;
      const logoHeight = (logoWidth * 600) / 1920;
      doc.addImage(
        logoDataUrl,
        "PNG",
        pageWidth - MARGIN - logoWidth,
        8,
        logoWidth,
        logoHeight,
      );
    } catch {
      console.warn("WIBEX logo skipped in summary PDF (unreadable image).");
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SUMMARY REPORT PROGRAM KERJA", MARGIN, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Program Kerja Engineering", MARGIN, 21);
  doc.setFontSize(9);
  doc.setTextColor(...MUTED_TEXT);

  const filterLines = doc.splitTextToSize(
    filterLine(meta),
    pageWidth - MARGIN * 2 - 92,
  );
  doc.text(filterLines, MARGIN, 27);

  const dateLabel = now.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const stampLabel = `Tanggal export: ${dateLabel}`;
  doc.text(
    stampLabel,
    pageWidth - MARGIN - doc.getTextWidth(stampLabel),
    27,
  );

  const filterBottom = 27 + Math.max(0, filterLines.length - 1) * 4;
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, filterBottom + 3, pageWidth - MARGIN, filterBottom + 3);
  doc.setTextColor(0);

  const units = selectedUnits(meta);
  let y = filterBottom + 9;
  y = drawKpiSection(doc, summary, meta, y);
  y = drawStatusSection(doc, summary, y);
  y = drawGroupSection(doc, summary, units, y);
  y = drawPicSection(doc, summary, units, y);
  y = drawMonthlySection(doc, summary, units, y);
  drawProgramTableSection(doc, summary, y);
  addPageNumbers(doc);

  return doc;
}

let lastPreviewUrl: string | null = null;

function revokeLastPreviewUrl(): void {
  if (lastPreviewUrl !== null) {
    URL.revokeObjectURL(lastPreviewUrl);
    lastPreviewUrl = null;
  }
}

export async function loadWibexLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch("/asset/logo-top.png");
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === "string" ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    console.warn("WIBEX logo skipped in summary PDF (unavailable).");
    return null;
  }
}

export function exportProgramKerjaSummaryPdf(
  summary: SummaryAggregate,
  meta: ProgramKerjaSummaryPdfMeta,
  logoDataUrl: string | null = null,
): void {
  const now = new Date();
  const doc = buildProgramKerjaSummaryPdf(summary, meta, now, logoDataUrl);
  doc.save(exportFileName(meta.year, now));
}

export function viewProgramKerjaSummaryPdf(
  summary: SummaryAggregate,
  meta: ProgramKerjaSummaryPdfMeta,
  logoDataUrl: string | null = null,
): void {
  const doc = buildProgramKerjaSummaryPdf(summary, meta, new Date(), logoDataUrl);
  const blob = doc.output("blob");
  revokeLastPreviewUrl();
  const url = URL.createObjectURL(blob);
  lastPreviewUrl = url;
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => {
    if (lastPreviewUrl === url) {
      revokeLastPreviewUrl();
    }
  }, 60000);
}
