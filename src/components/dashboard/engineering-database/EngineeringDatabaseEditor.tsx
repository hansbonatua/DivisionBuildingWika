"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ENGINEERING_DATABASE_CATEGORY_LABELS,
  engineeringDatabaseCategoryToSlug,
  type EngineeringDatabaseCategory,
} from "@/lib/engineering-database/access";
import EngineeringDatabaseProjectCombobox, {
  type ProjectOption,
} from "@/components/dashboard/engineering-database/EngineeringDatabaseProjectCombobox";

// Shared create/edit editor for one Engineering Database category. Category is
// supplied by the route, rendered read-only, and never included in the update
// payload (immutable after creation). The project is always a canonical Master
// Project picked from the searchable combobox — never free text.

type EditorMode = "create" | "edit";

type EntryDetail = {
  id: string;
  project: { id: string; name: string; location: string };
  category: EngineeringDatabaseCategory;
  fileUrl: string;
  pic: { id: string; name: string };
  note: string;
};

type PicOption = {
  id: string;
  name: string;
};

type ApiErrorBody = {
  error?: {
    message?: string;
    details?: Record<string, string[] | undefined>;
  };
};

const NOTE_MAX_LENGTH = 10000;

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function firstValidationDetail(
  details: Record<string, string[] | undefined> | undefined,
): string | null {
  if (!details) {
    return null;
  }
  for (const messages of Object.values(details)) {
    const message = messages?.find((value) => value.trim() !== "");
    if (message) {
      return message;
    }
  }
  return null;
}

async function readApiError(response: Response): Promise<ApiErrorBody["error"]> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.error;
  } catch {
    return undefined;
  }
}

async function submitErrorMessage(
  response: Response,
  mode: EditorMode,
): Promise<string> {
  if (response.status === 401 || response.status === 403) {
    return "Anda tidak memiliki akses untuk menyimpan data Engineering Database.";
  }
  if (response.status === 400 || response.status === 409 || response.status === 404) {
    const error = await readApiError(response);
    const detail = firstValidationDetail(error?.details);
    if (detail) {
      return detail;
    }
    if (error?.message && error.message.trim() !== "") {
      return error.message;
    }
    if (response.status === 404) {
      return "Data Engineering Database tidak ditemukan.";
    }
  }
  return mode === "create"
    ? "Gagal menambahkan data Engineering Database."
    : "Gagal menyimpan perubahan data Engineering Database.";
}

export default function EngineeringDatabaseEditor({
  mode,
  category,
  entryId,
}: {
  mode: EditorMode;
  category: EngineeringDatabaseCategory;
  entryId?: string;
}) {
  const categoryLabel = ENGINEERING_DATABASE_CATEGORY_LABELS[category];
  const [initial, setInitial] = useState<EntryDetail | null>(null);
  const [recordLoading, setRecordLoading] = useState(mode === "edit");
  const [recordError, setRecordError] = useState<string | null>(null);
  const [recordMissing, setRecordMissing] = useState(false);
  const [categoryMismatch, setCategoryMismatch] = useState(false);
  const [recordReloadToken, setRecordReloadToken] = useState(0);
  const [picOptions, setPicOptions] = useState<PicOption[]>([]);
  const [picLoading, setPicLoading] = useState(true);
  const [picError, setPicError] = useState<string | null>(null);
  const [picReloadToken, setPicReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadPicOptions(): Promise<void> {
      setPicLoading(true);
      setPicError(null);
      try {
        const response = await fetch("/api/engineering-database/pic-options", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) {
          if (active) {
            setPicError("Anda tidak memiliki akses ke daftar PIC.");
          }
          return;
        }
        if (!response.ok) {
          throw new Error("LOAD_FAILED");
        }
        const body = (await response.json()) as { data?: unknown };
        if (!Array.isArray(body.data)) {
          throw new Error("INVALID_RESPONSE");
        }
        const options = body.data
          .filter(
            (item): item is PicOption =>
              typeof item === "object" &&
              item !== null &&
              typeof (item as PicOption).id === "string" &&
              typeof (item as PicOption).name === "string",
          )
          .map((item) => ({ id: item.id, name: item.name }));
        if (active) {
          setPicOptions(options);
        }
      } catch {
        if (!active || controller.signal.aborted) {
          return;
        }
        setPicError("Gagal memuat daftar PIC.");
      } finally {
        if (active) {
          setPicLoading(false);
        }
      }
    }

    void loadPicOptions();

    return () => {
      active = false;
      controller.abort();
    };
  }, [picReloadToken]);

  useEffect(() => {
    if (mode !== "edit") {
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function loadRecord(): Promise<void> {
      setRecordLoading(true);
      setRecordError(null);
      setRecordMissing(false);
      setCategoryMismatch(false);
      try {
        if (!entryId) {
          if (active) {
            setRecordMissing(true);
          }
          return;
        }
        const response = await fetch(`/api/engineering-database/${entryId}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 400 || response.status === 404) {
          if (active) {
            setRecordMissing(true);
          }
          return;
        }
        if (response.status === 401 || response.status === 403) {
          if (active) {
            setRecordError("UNAUTHORIZED");
          }
          return;
        }
        if (!response.ok) {
          throw new Error("LOAD_FAILED");
        }
        const body = (await response.json()) as { data?: EntryDetail };
        if (!body.data) {
          throw new Error("INVALID_RESPONSE");
        }
        if (body.data.category !== category) {
          // Category is immutable: an entry reached through another category's
          // route is not editable here.
          if (active) {
            setCategoryMismatch(true);
          }
          return;
        }
        if (active) {
          setInitial(body.data);
        }
      } catch {
        if (!active || controller.signal.aborted) {
          return;
        }
        setRecordError("Gagal memuat data Engineering Database.");
      } finally {
        if (active) {
          setRecordLoading(false);
        }
      }
    }

    void loadRecord();

    return () => {
      active = false;
      controller.abort();
    };
  }, [mode, entryId, category, recordReloadToken]);

  const slug = engineeringDatabaseCategoryToSlug(category);
  const listHref = `/dashboard/engineering-database/${slug}`;

  if (mode === "edit" && recordLoading) {
    return (
      <div className="max-w-3xl rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-primary/70">
          Memuat data {categoryLabel}...
        </p>
      </div>
    );
  }

  if (mode === "edit" && categoryMismatch) {
    return (
      <div className="max-w-3xl rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-primary">
          Data ini bukan bagian dari kategori {categoryLabel}.
        </p>
        <p className="mt-1 text-xs text-primary/60">
          Kategori tidak dapat diubah setelah data dibuat.
        </p>
        <Link
          href={listHref}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
        >
          Kembali ke {categoryLabel}
        </Link>
      </div>
    );
  }

  if (mode === "edit" && recordMissing) {
    return (
      <div className="max-w-3xl rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-primary">
          Data Engineering Database tidak ditemukan.
        </p>
        <p className="mt-1 text-xs text-primary/60">
          Data dengan ID tersebut tidak tersedia pada kategori ini.
        </p>
        <Link
          href={listHref}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
        >
          Kembali ke {categoryLabel}
        </Link>
      </div>
    );
  }

  if (mode === "edit" && recordError) {
    const unauthorized = recordError === "UNAUTHORIZED";
    return (
      <div className="max-w-3xl rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-primary">
          {unauthorized ? "Anda tidak memiliki akses ke halaman ini." : recordError}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {!unauthorized ? (
            <button
              type="button"
              onClick={() => setRecordReloadToken((value) => value + 1)}
              className="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
            >
              Coba Lagi
            </button>
          ) : null}
          <Link
            href={listHref}
            className="rounded-lg border border-outline bg-surface px-5 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background"
          >
            Kembali ke {categoryLabel}
          </Link>
        </div>
      </div>
    );
  }

  if (mode === "edit" && !initial) {
    return null;
  }

  return (
    <EntryFields
      key={mode === "edit" ? entryId : "create"}
      mode={mode}
      category={category}
      categoryLabel={categoryLabel}
      entryId={entryId}
      initial={initial}
      picOptions={picOptions}
      picLoading={picLoading}
      picError={picError}
      onRetryPic={() => setPicReloadToken((value) => value + 1)}
    />
  );
}

function EntryFields({
  mode,
  category,
  categoryLabel,
  entryId,
  initial,
  picOptions,
  picLoading,
  picError,
  onRetryPic,
}: {
  mode: EditorMode;
  category: EngineeringDatabaseCategory;
  categoryLabel: string;
  entryId?: string;
  initial: EntryDetail | null;
  picOptions: PicOption[];
  picLoading: boolean;
  picError: string | null;
  onRetryPic: () => void;
}) {
  const router = useRouter();
  const slug = engineeringDatabaseCategoryToSlug(category);
  const listHref = `/dashboard/engineering-database/${slug}`;
  const [project, setProject] = useState<ProjectOption | null>(
    initial
      ? {
          id: initial.project.id,
          name: initial.project.name,
          location: initial.project.location,
        }
      : null,
  );
  const [fileUrl, setFileUrl] = useState(initial?.fileUrl ?? "");
  const [picUserId, setPicUserId] = useState(initial?.pic.id ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [projectInvalid, setProjectInvalid] = useState(false);

  const picUnavailable = picLoading || picError !== null || picOptions.length === 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const trimmedFileUrl = fileUrl.trim();
    const trimmedNote = note.trim();

    if (!project) {
      setProjectInvalid(true);
      setFormError("Pilih Master Project terlebih dahulu.");
      return;
    }
    if (trimmedFileUrl === "") {
      setFormError("Link File wajib diisi.");
      return;
    }
    if (!isHttpUrl(trimmedFileUrl)) {
      setFormError("Link File harus menggunakan http:// atau https://.");
      return;
    }
    if (picUserId === "") {
      setFormError("Pilih PIC.");
      return;
    }
    if (trimmedNote === "") {
      setFormError("Note wajib diisi.");
      return;
    }
    if (trimmedNote.length > NOTE_MAX_LENGTH) {
      setFormError(`Note maksimal ${NOTE_MAX_LENGTH} karakter.`);
      return;
    }

    setFormError(null);
    setProjectInvalid(false);
    setSubmitting(true);
    try {
      const isCreate = mode === "create";
      const endpoint = isCreate
        ? "/api/engineering-database"
        : `/api/engineering-database/${entryId}`;
      const payload: Record<string, string> = {
        projectId: project.id,
        fileUrl: trimmedFileUrl,
        picUserId,
        note: trimmedNote,
      };
      if (isCreate) {
        payload.category = category;
      }
      const response = await fetch(endpoint, {
        method: isCreate ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await submitErrorMessage(response, mode));
      }
      router.replace(listHref);
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : mode === "create"
            ? "Gagal menambahkan data Engineering Database."
            : "Gagal menyimpan perubahan data Engineering Database.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
      className="w-full max-w-3xl space-y-5"
    >
      <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm">
        <div className="border-b border-outline bg-background px-5 py-4">
          <h2 className="text-sm font-bold text-primary">Informasi Dokumen</h2>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              Kategori
            </span>
            <div className="flex h-10 items-center rounded-lg border border-outline/60 bg-slate-50 px-3.5 text-xs font-semibold text-primary/70">
              {categoryLabel}
            </div>
            <p className="mt-1 text-[11px] text-primary/50">
              Kategori ditentukan oleh halaman dan tidak dapat diubah.
            </p>
          </div>

          <div>
            <label
              htmlFor="engineeringDatabaseProject"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Master Project <span className="text-red-700">*</span>
            </label>
            <EngineeringDatabaseProjectCombobox
              id="engineeringDatabaseProject"
              value={project}
              onChange={(option) => {
                setProject(option);
                if (option) {
                  setProjectInvalid(false);
                  setFormError(null);
                }
              }}
              disabled={submitting}
              invalid={projectInvalid}
            />
            <p className="mt-1 text-[11px] text-primary/50">
              Cari dan pilih proyek dari Master Project. Nama dan lokasi proyek
              mengikuti data Master Project.
            </p>
          </div>

          <div>
            <label
              htmlFor="engineeringDatabaseFileUrl"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Link File <span className="text-red-700">*</span>
            </label>
            <input
              id="engineeringDatabaseFileUrl"
              type="url"
              required
              maxLength={2000}
              value={fileUrl}
              disabled={submitting}
              onChange={(event) => setFileUrl(event.target.value)}
              placeholder="https://drive.google.com/..."
              aria-describedby="engineeringDatabaseFileUrlHelp"
              className={inputClass}
            />
            <p id="engineeringDatabaseFileUrlHelp" className="mt-1 text-[11px] text-primary/50">
              Masukkan tautan Google Drive, SharePoint, OneDrive, atau dokumen
              HTTP(S) lainnya.
            </p>
          </div>

          <div>
            <label
              htmlFor="engineeringDatabasePic"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              PIC <span className="text-red-700">*</span>
            </label>
            <select
              id="engineeringDatabasePic"
              required
              value={picUserId}
              disabled={submitting || picUnavailable}
              onChange={(event) => setPicUserId(event.target.value)}
              className={inputClass}
            >
              {picLoading ? (
                <option value="">Memuat daftar PIC...</option>
              ) : (
                <>
                  <option value="">— Pilih PIC —</option>
                  {picOptions.map((pic) => (
                    <option key={pic.id} value={pic.id}>
                      {pic.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            {picError ? (
              <div
                role="alert"
                className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-red-700"
              >
                <span>{picError}</span>
                <button
                  type="button"
                  onClick={onRetryPic}
                  className="rounded border border-red-300 bg-red-50 px-2 py-0.5 font-bold text-red-700 transition-colors hover:bg-red-100"
                >
                  Coba Lagi
                </button>
              </div>
            ) : !picLoading && picOptions.length === 0 ? (
              <p className="mt-1.5 text-[11px] text-primary/50">
                Belum ada PIC dengan role Admin, Head Office, atau Project.
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-primary/50">
                PIC harus user dengan role Admin, Head Office, atau Project.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="engineeringDatabaseNote"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Note <span className="text-red-700">*</span>
            </label>
            <textarea
              id="engineeringDatabaseNote"
              required
              rows={4}
              maxLength={NOTE_MAX_LENGTH}
              value={note}
              disabled={submitting}
              onChange={(event) => setNote(event.target.value)}
              placeholder="cth. Drawing revisi 02, sudah diverifikasi PIC"
              className="w-full rounded-lg border border-outline/60 bg-white px-3.5 py-2.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50"
            />
            <p className="mt-1 text-[11px] text-primary/50">
              {note.length}/{NOTE_MAX_LENGTH} karakter
            </p>
          </div>
        </div>
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
        >
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href={listHref}
          className="rounded-lg border border-outline bg-surface px-5 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={submitting || picUnavailable}
          className="rounded-lg bg-primary px-6 py-2.5 text-xs font-bold text-white shadow transition-all hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? "Menyimpan..."
            : mode === "create"
              ? "Simpan Data"
              : "Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}
