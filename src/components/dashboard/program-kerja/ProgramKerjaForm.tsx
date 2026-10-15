"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PROGRAM_KERJA_UNITS,
  type ProgramKerjaUnit,
} from "@/lib/program-kerja/access";

export type ProgramKerjaGroupOption = { id: string; name: string };
export type ProgramKerjaPicOption = { id: string; name: string };

export type ProgramKerjaFormInitial = {
  groupId: string;
  name: string;
  description: string;
  startMonth: number;
  endMonth: number;
  parameter: string;
  unit: ProgramKerjaUnit;
  monitor: string;
  raPercentage: number;
  monthlyRa: number[];
  picIds: string[];
};

export type ProgramKerjaFormValues = {
  groupId: string;
  year: number;
  name: string;
  description: string;
  startMonth: number;
  endMonth: number;
  parameter: string;
  unit: ProgramKerjaUnit;
  monitor: string;
  raPercentage: number;
  monthlyRa: number[];
  picIds: string[];
};

type ProgramKerjaFormProps = {
  mode: "add" | "edit";
  initial: ProgramKerjaFormInitial;
  groups: ProgramKerjaGroupOption[];
  picOptions: ProgramKerjaPicOption[];
  year?: number;
  riMonths?: number[];
  submitLabel: string;
  onSubmit: (values: ProgramKerjaFormValues) => void | Promise<void>;
};

export const MONTH_OPTIONS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];
export const MONTH_SHORT = [
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

export function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 11 }, (_, index) => currentYear + index);
}

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

function clampMonth(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(12, Math.max(1, Math.trunc(value)));
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-outline/60 bg-surface shadow-sm">
      <div className="border-b border-outline/60 bg-background px-4 py-3">
        <h3 className="text-sm font-bold text-primary">{title}</h3>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </div>
  );
}

export default function ProgramKerjaForm({
  mode,
  initial,
  groups,
  picOptions,
  year,
  riMonths = [],
  submitLabel,
  onSubmit,
}: ProgramKerjaFormProps) {
  const [formGroupId, setFormGroupId] = useState(initial.groupId);
  const [formYear, setFormYear] = useState(year ?? new Date().getFullYear());
  const [formName, setFormName] = useState(initial.name);
  const [formDescription, setFormDescription] = useState(initial.description);
  const [formStartMonth, setFormStartMonth] = useState(initial.startMonth);
  const [formEndMonth, setFormEndMonth] = useState(initial.endMonth);
  const [formParameter, setFormParameter] = useState(initial.parameter);
  const [formUnit, setFormUnit] = useState<ProgramKerjaUnit>(initial.unit);
  const [formMonitor, setFormMonitor] = useState(initial.monitor);
  const [formRaPercentage, setFormRaPercentage] = useState(initial.raPercentage);
  const [formMonthlyRa, setFormMonthlyRa] = useState<number[]>(() =>
    Array.from({ length: 12 }, (_, index) => initial.monthlyRa[index] ?? 0),
  );
  const [formPicIds, setFormPicIds] = useState<string[]>(initial.picIds);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasRi = riMonths.length > 0;
  const unitLocked = mode === "edit" && hasRi;
  const minRiMonth = hasRi ? Math.min(...riMonths) : null;
  const maxRiMonth = hasRi ? Math.max(...riMonths) : null;

  function handleUnitChange(next: string): void {
    if (next !== "Jumlah" && next !== "Persentase") {
      return;
    }
    if (unitLocked) {
      return;
    }
    setFormUnit(next);
    // Reset RA state on unit switch so stale values from the other unit
    // can never leak ambiguously into the payload.
    if (next === "Persentase") {
      setFormRaPercentage(100);
    } else {
      setFormMonthlyRa(Array.from({ length: 12 }, () => 0));
    }
  }

  function handleStartChange(value: number): void {
    const start = clampMonth(value);
    setFormStartMonth(start);
    // Months leaving the period reset to 0 in form state.
    setFormMonthlyRa((prev) => prev.map((ra, index) => (index + 1 < start ? 0 : ra)));
  }

  function handleEndChange(value: number): void {
    const end = clampMonth(value);
    setFormEndMonth(end);
    setFormMonthlyRa((prev) => prev.map((ra, index) => (index + 1 > end ? 0 : ra)));
  }

  function setMonthRa(month: number, value: number): void {
    const safe = Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
    setFormMonthlyRa((prev) => prev.map((ra, index) => (index + 1 === month ? safe : ra)));
  }

  function togglePic(id: string): void {
    setFormPicIds((prev) => (prev.includes(id) ? prev.filter((pic) => pic !== id) : [...prev, id]));
  }

  const totalRa = formMonthlyRa.reduce((sum, value) => sum + value, 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }
    if (!formGroupId || !formName.trim() || !formDescription.trim() || !formParameter.trim()) {
      setFormError("Lengkapi kelompok, nama, deskripsi, dan parameter.");
      return;
    }
    if (formStartMonth > formEndMonth) {
      setFormError("Bulan mulai tidak boleh setelah bulan selesai.");
      return;
    }
    if (
      hasRi &&
      minRiMonth !== null &&
      maxRiMonth !== null &&
      (formStartMonth > minRiMonth || formEndMonth < maxRiMonth)
    ) {
      setFormError("Periode baru harus tetap mencakup semua bulan yang memiliki RI.");
      return;
    }
    if (formPicIds.length === 0) {
      setFormError("Pilih minimal 1 PIC.");
      return;
    }
    if (formUnit === "Persentase") {
      if (!Number.isFinite(formRaPercentage) || formRaPercentage < 0 || formRaPercentage > 100) {
        setFormError("Nilai RA harus antara 0–100.");
        return;
      }
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        groupId: formGroupId,
        year: formYear,
        name: formName.trim(),
        description: formDescription.trim(),
        startMonth: formStartMonth,
        endMonth: formEndMonth,
        parameter: formParameter.trim(),
        unit: formUnit,
        monitor: formMonitor.trim(),
        raPercentage: formUnit === "Persentase" ? formRaPercentage : 0,
        monthlyRa:
          formUnit === "Jumlah"
            ? formMonthlyRa.map((ra, index) =>
                index + 1 < formStartMonth || index + 1 > formEndMonth ? 0 : ra,
              )
            : Array.from({ length: 12 }, () => 0),
        picIds: formPicIds,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Gagal menyimpan Program Kerja.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <Section title="Informasi Program">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="pk_group" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Kelompok Program <span className="text-red-700">*</span>
            </label>
            <select id="pk_group" value={formGroupId} onChange={(e) => setFormGroupId(e.target.value)} className={inputClass}>
              <option value="">— Pilih kelompok —</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pk_year" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Tahun {mode === "add" ? <span className="text-red-700">*</span> : null}
            </label>
            {mode === "add" ? (
              <>
                <select
                  id="pk_year"
                  value={formYear}
                  onChange={(e) => setFormYear(Number(e.target.value))}
                  className={inputClass}
                >
                  {getYearOptions().map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">Pilih tahun pelaksanaan Program Kerja.</p>
              </>
            ) : (
              <>
                <div className={`${inputClass} flex cursor-not-allowed items-center bg-slate-50 text-slate-500`}>
                  {year}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Tahun terkunci setelah Program Kerja dibuat.</p>
              </>
            )}
          </div>
        </div>
        <div>
          <label htmlFor="pk_name" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Nama Program Kerja <span className="text-red-700">*</span>
          </label>
          <input
            id="pk_name"
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="pk_description" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Deskripsi Program Kerja <span className="text-red-700">*</span>
          </label>
          <textarea
            id="pk_description"
            rows={3}
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            className="w-full rounded-lg border border-outline/60 bg-white px-3.5 py-2.5 text-xs text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>
      </Section>

      <Section title="Perencanaan">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="pk_start" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Bulan Mulai <span className="text-red-700">*</span>
            </label>
            <select
              id="pk_start"
              value={formStartMonth}
              onChange={(e) => handleStartChange(Number(e.target.value))}
              className={inputClass}
            >
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.value} — {month.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pk_end" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Bulan Selesai <span className="text-red-700">*</span>
            </label>
            <select
              id="pk_end"
              value={formEndMonth}
              onChange={(e) => handleEndChange(Number(e.target.value))}
              className={inputClass}
            >
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.value} — {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="pk_parameter" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Parameter <span className="text-red-700">*</span>
            </label>
            <input
              id="pk_parameter"
              type="text"
              value={formParameter}
              onChange={(e) => setFormParameter(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="pk_unit" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Unit <span className="text-red-700">*</span>
            </label>
            <select
              id="pk_unit"
              value={formUnit}
              disabled={unitLocked}
              onChange={(e) => handleUnitChange(e.target.value)}
              className={`${inputClass} ${unitLocked ? "cursor-not-allowed bg-slate-50 text-slate-500" : ""}`}
            >
              {PROGRAM_KERJA_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            {unitLocked ? (
              <p className="mt-1 text-[11px] text-slate-400">
                Unit tidak dapat diubah karena data realisasi (RI) sudah tercatat.
              </p>
            ) : null}
          </div>
        </div>
        <div>
          <label htmlFor="pk_monitor" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Monitor
          </label>
          <input
            id="pk_monitor"
            type="text"
            value={formMonitor}
            onChange={(e) => setFormMonitor(e.target.value)}
            className={inputClass}
          />
        </div>
      </Section>

      <Section title="Target / RA">
        {formUnit === "Persentase" ? (
          <div>
            <label htmlFor="pk_ra" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Nilai RA (%) <span className="text-red-700">*</span>
            </label>
            <input
              id="pk_ra"
              type="number"
              min={0}
              max={100}
              value={formRaPercentage}
              onChange={(e) => setFormRaPercentage(Number(e.target.value))}
              className={inputClass}
            />
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
              {MONTH_SHORT.map((label, index) => {
                const month = index + 1;
                const outside = month < formStartMonth || month > formEndMonth;
                return (
                  <div
                    key={label}
                    className={`rounded-lg border px-2 py-2 text-center ${
                      outside ? "border-blue-200 bg-blue-50/60" : "border-outline/60 bg-white"
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
                    <div className={`text-sm font-bold ${outside ? "text-blue-800" : "text-primary"}`}>
                      {formRaPercentage}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Berlaku untuk Jan–Des. Biru menandakan bulan di luar periode.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                RA Bulanan <span className="text-red-700">*</span>
              </span>
              <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">
                Total RA: {totalRa}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
              {MONTH_SHORT.map((label, index) => {
                const month = index + 1;
                const outside = month < formStartMonth || month > formEndMonth;
                return (
                  <div key={label}>
                    <div
                      className={`rounded-lg border px-2 py-2 text-center ${
                        outside ? "border-blue-200 bg-blue-50/60" : "border-outline/60 bg-white"
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        disabled={outside}
                        value={outside ? 0 : (formMonthlyRa[index] ?? 0)}
                        onChange={(e) => setMonthRa(month, Number(e.target.value))}
                        aria-label={`RA bulan ${label}`}
                        className="mt-1 w-full bg-transparent text-center text-sm font-bold text-primary focus:outline-none disabled:cursor-not-allowed disabled:text-blue-800"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Bulan di luar periode bernilai 0 dan tidak dapat diubah.
            </p>
          </div>
        )}
      </Section>

      <Section title="Penanggung Jawab">
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">
            PIC (Head Office) <span className="text-red-700">*</span>
          </span>
          {picOptions.length === 0 ? (
            <p className="rounded-lg border border-outline/60 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
              Belum ada user Head Office yang dapat ditugaskan.
            </p>
          ) : (
            <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-outline/60 p-3 sm:grid-cols-2">
              {picOptions.map((pic) => (
                <label
                  key={pic.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-outline/40 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={formPicIds.includes(pic.id)}
                    onChange={() => togglePic(pic.id)}
                    className="h-4 w-4 shrink-0 rounded border-slate-300"
                  />
                  <span className="truncate">{pic.name}</span>
                </label>
              ))}
            </div>
          )}
          <p className="mt-1 text-[11px] text-slate-400">Minimal 1 PIC. Hanya user Head Office.</p>
        </div>
      </Section>

      {formError ? (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/dashboard/program-kerja/manage"
          className="rounded-lg border border-outline bg-surface px-5 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-primary px-6 py-2.5 text-xs font-bold text-white shadow transition-all hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{submitting ? "Menyimpan..." : submitLabel}</span>
        </button>
      </div>
    </form>
  );
}
