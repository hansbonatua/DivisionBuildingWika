"use client";

import { MSL_NOTE_MAX_LENGTH } from "./msl-draft";

// Annual note for the selected year (one per year, owned by the backend).
// Editable only for manage roles, and only when the year actually has Master
// Projects — the API rejects a note for a year with no project, so the UI never
// offers a request that is guaranteed to fail.

export default function MslYearNote({
  year,
  canManage,
  hasProjects,
  note,
  savedNote,
  saving,
  onChange,
  onSave,
}: {
  year: number;
  canManage: boolean;
  hasProjects: boolean;
  note: string;
  savedNote: string;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  const editable = canManage && hasProjects;
  const dirty = note !== savedNote;

  return (
    <section className="rounded-lg border border-outline bg-surface shadow-sm">
      <div className="flex flex-col gap-1 border-b border-outline p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {/* The year is spelled out on purpose: the note is per YEAR, so it
              must never read as belonging to the selected month. */}
          <h2 className="text-sm font-bold text-primary">Note Akhir Tahun {year}</h2>
          <p className="mt-0.5 text-xs text-primary/50">
            Catatan keseluruhan MSL Engineering untuk tahun {year} (tidak berubah
            saat bulan diganti).
          </p>
        </div>
        {editable ? (
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !dirty}
            className="mt-2 inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0"
          >
            {saving ? "Menyimpan..." : "Simpan Note"}
          </button>
        ) : null}
      </div>

      <div className="p-4">
        {!canManage ? (
          note.trim() === "" ? (
            <p className="text-xs font-medium text-primary/60">Belum ada note akhir tahun.</p>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-primary/80">{note}</p>
          )
        ) : hasProjects ? (
          <>
            <label htmlFor="msl-year-note" className="sr-only">
              Note Akhir Tahun {year}
            </label>
            <textarea
              id="msl-year-note"
              rows={6}
              maxLength={MSL_NOTE_MAX_LENGTH}
              value={note}
              disabled={saving}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Tulis note akhir tahun untuk tahun ini..."
              className="w-full rounded-lg border border-outline/60 bg-white p-3 text-sm text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            <p className="mt-1 text-[11px] text-primary/50">
              {saving
                ? "Menyimpan..."
                : dirty
                  ? "Perubahan belum disimpan."
                  : "Tersimpan."}
            </p>
          </>
        ) : (
          <>
            <textarea
              id="msl-year-note"
              rows={4}
              value=""
              disabled
              aria-label={`Note Akhir Tahun ${year}`}
              placeholder="Belum ada Master Project pada tahun ini."
              className="w-full rounded-lg border border-outline/60 bg-slate-50 p-3 text-sm text-primary placeholder:text-primary/40"
            />
            <p className="mt-1 text-[11px] text-primary/60">
              Note akhir tahun dapat diisi setelah terdapat Master Project pada tahun ini.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
