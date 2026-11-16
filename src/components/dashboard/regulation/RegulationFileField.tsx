"use client";

import {
  REGULATION_ACCEPT_ATTRIBUTE,
  REGULATION_MAX_FILE_SIZE_BYTES,
} from "@/lib/regulation/storage";
import {
  REGULATION_MAX_FILE_SIZE_LABEL,
  formatRegulationFileSize,
  regulationFileTypeLabel,
} from "@/components/dashboard/regulation/regulation-ui";

// New isolated file field for Standard & Regulation. It only chooses/clears a
// local File; format and size validation plus the actual upload live in the
// document dialog so one dialog owns the submit sequence.

function FileBadge({ fileName }: { fileName: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-secondary">
      {regulationFileTypeLabel(fileName)}
    </span>
  );
}

export default function RegulationFileField({
  inputId,
  pendingFile,
  existingFile,
  filePickerOpen,
  disabled,
  onSelect,
  onRemovePending,
  onOpenPicker,
  onCancelPicker,
}: {
  inputId: string;
  pendingFile: File | null;
  existingFile: { name: string; size: number } | null;
  filePickerOpen: boolean;
  disabled: boolean;
  onSelect: (file: File | null) => void;
  onRemovePending: () => void;
  onOpenPicker: () => void;
  onCancelPicker: () => void;
}) {
  const showPicker = !pendingFile && (!existingFile || filePickerOpen);
  const helperId = `${inputId}-help`;

  return (
    <div className="rounded-xl border border-outline/60 bg-background/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">
          File <span className="text-red-700">*</span>
        </p>
        {existingFile && !pendingFile && !filePickerOpen ? (
          <button
            type="button"
            onClick={onOpenPicker}
            disabled={disabled}
            className="rounded border border-outline bg-white px-3 py-1.5 text-[11px] font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            Ganti File
          </button>
        ) : null}
        {existingFile && !pendingFile && filePickerOpen ? (
          <button
            type="button"
            onClick={onCancelPicker}
            disabled={disabled}
            className="rounded border border-outline bg-white px-3 py-1.5 text-[11px] font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            Batal Ganti
          </button>
        ) : null}
      </div>

      {existingFile && !pendingFile ? (
        <div className="mt-2 rounded-lg border border-outline/50 bg-white px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary/45">
            File saat ini
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <FileBadge fileName={existingFile.name} />
            <span
              className="min-w-0 break-all text-xs font-semibold text-primary"
              title={existingFile.name}
            >
              {existingFile.name}
            </span>
            <span className="text-[11px] font-medium text-primary/50">
              {formatRegulationFileSize(existingFile.size)}
            </span>
          </div>
        </div>
      ) : null}

      {pendingFile ? (
        <div className="mt-2 rounded-lg border border-secondary/40 bg-blue-50/70 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary/45">
            File baru
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <FileBadge fileName={pendingFile.name} />
            <span
              className="min-w-0 break-all text-xs font-semibold text-primary"
              title={pendingFile.name}
            >
              {pendingFile.name}
            </span>
            <span className="text-[11px] font-medium text-primary/50">
              {formatRegulationFileSize(pendingFile.size)}
            </span>
          </div>
          {existingFile ? (
            <p className="mt-1.5 text-[11px] font-semibold text-amber-700">
              File saat ini akan diganti setelah penyimpanan berhasil.
            </p>
          ) : null}
          <button
            type="button"
            onClick={onRemovePending}
            disabled={disabled}
            className="mt-2 rounded border border-outline bg-white px-3 py-1.5 text-[11px] font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hapus Pilihan
          </button>
        </div>
      ) : null}

      {showPicker ? (
        <div className="mt-2 rounded-lg border border-dashed border-outline bg-white/70 px-4 py-5 text-center">
          <input
            id={inputId}
            type="file"
            accept={REGULATION_ACCEPT_ATTRIBUTE}
            disabled={disabled}
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              onSelect(selected);
              // Allow choosing the same file again after removing it.
              event.target.value = "";
            }}
            aria-describedby={helperId}
            className="peer sr-only"
          />
          <label
            htmlFor={inputId}
            className={`inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-secondary peer-focus-visible:ring-offset-2 ${
              disabled
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:bg-secondary"
            }`}
          >
            Pilih File
          </label>
          <p
            id={helperId}
            className="mt-2 text-[11px] leading-relaxed text-primary/50"
          >
            PDF, DOC/DOCX, XLS/XLSX, atau ZIP · maksimal{" "}
            {REGULATION_MAX_FILE_SIZE_LABEL}.
          </p>
        </div>
      ) : null}

      <p className="mt-2 text-[11px] leading-relaxed text-primary/50">
        File disimpan privat dan hanya dapat diunduh melalui aplikasi. Ukuran
        maksimum {Math.round(REGULATION_MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB.
      </p>
    </div>
  );
}
