"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MasterProjectEditorMode = "create" | "edit";

type MasterProjectInitial = {
  name: string;
  location: string;
  // Held as a string because it backs a number input; converted to an integer
  // only when the payload is built.
  year: string;
  picUserId: string;
};

type MasterProjectDetail = {
  id: string;
  name: string;
  location: string;
  year?: number;
  pic?: { id?: string; name?: string } | null;
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

const EMPTY_INITIAL: MasterProjectInitial = {
  name: "",
  location: "",
  year: "",
  picUserId: "",
};

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";

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
  mode: MasterProjectEditorMode,
): Promise<string> {
  if (response.status === 409) {
    return "Nama proyek dan lokasi tersebut sudah terdaftar.";
  }
  if (response.status === 401 || response.status === 403) {
    return "Anda tidak memiliki akses untuk menyimpan Master Project.";
  }
  if (response.status === 404) {
    return "Master Project tidak ditemukan.";
  }
  if (response.status === 400) {
    const error = await readApiError(response);
    const detail = firstValidationDetail(error?.details);
    if (detail) {
      return detail;
    }
    if (error?.message && error.message.trim() !== "") {
      return error.message;
    }
    return "Validasi gagal. Periksa kembali isian form.";
  }
  return mode === "create"
    ? "Gagal menambahkan Master Project."
    : "Gagal menyimpan perubahan Master Project.";
}

export default function MasterProjectEditor({
  mode,
  masterProjectId,
}: {
  mode: MasterProjectEditorMode;
  masterProjectId?: string;
}) {
  const [initial, setInitial] = useState<MasterProjectInitial | null>(
    mode === "create" ? EMPTY_INITIAL : null,
  );
  const [recordLoading, setRecordLoading] = useState(mode === "edit");
  const [recordError, setRecordError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
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
        const response = await fetch("/api/master-project/pic-options", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
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
      setNotFound(false);
      try {
        if (!masterProjectId) {
          if (active) {
            setNotFound(true);
          }
          return;
        }
        const response = await fetch(`/api/master-project/${masterProjectId}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 400 || response.status === 404) {
          if (active) {
            setNotFound(true);
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
        const body = (await response.json()) as { data?: MasterProjectDetail };
        if (!body.data) {
          throw new Error("INVALID_RESPONSE");
        }
        const detail = body.data;
        if (active) {
          setInitial({
            name: detail.name,
            location: detail.location,
            year: typeof detail.year === "number" ? String(detail.year) : "",
            picUserId: detail.pic?.id ?? "",
          });
        }
      } catch {
        if (!active || controller.signal.aborted) {
          return;
        }
        setRecordError("Gagal memuat Master Project.");
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
  }, [mode, masterProjectId, recordReloadToken]);

  if (mode === "edit" && recordLoading) {
    return (
      <div className="max-w-3xl rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-primary/70">
          Memuat data Master Project...
        </p>
      </div>
    );
  }

  if (mode === "edit" && notFound) {
    return (
      <div className="max-w-3xl rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-primary">
          Master Project tidak ditemukan.
        </p>
        <p className="mt-1 text-xs text-primary/60">
          Data dengan ID tersebut tidak tersedia.
        </p>
        <Link
          href="/dashboard/master-project/manage"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
        >
          Kembali ke Kelola Project
        </Link>
      </div>
    );
  }

  if (mode === "edit" && recordError) {
    const unauthorized = recordError === "UNAUTHORIZED";
    return (
      <div className="max-w-3xl rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-primary">
          {unauthorized
            ? "Anda tidak memiliki akses ke halaman ini."
            : recordError}
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
            href="/dashboard/master-project/manage"
            className="rounded-lg border border-outline bg-surface px-5 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background"
          >
            Kembali ke Kelola Project
          </Link>
        </div>
      </div>
    );
  }

  if (mode === "edit" && !initial) {
    return null;
  }

  return (
    <MasterProjectFields
      key={mode === "edit" ? masterProjectId : "create"}
      mode={mode}
      masterProjectId={masterProjectId}
      initial={initial ?? EMPTY_INITIAL}
      picOptions={picOptions}
      picLoading={picLoading}
      picError={picError}
      onRetryPic={() => setPicReloadToken((value) => value + 1)}
    />
  );
}

function MasterProjectFields({
  mode,
  masterProjectId,
  initial,
  picOptions,
  picLoading,
  picError,
  onRetryPic,
}: {
  mode: MasterProjectEditorMode;
  masterProjectId?: string;
  initial: MasterProjectInitial;
  picOptions: PicOption[];
  picLoading: boolean;
  picError: string | null;
  onRetryPic: () => void;
}) {
  const router = useRouter();
  const [formName, setFormName] = useState(initial.name);
  const [formLocation, setFormLocation] = useState(initial.location);
  const [formYear, setFormYear] = useState(initial.year);
  const [formPicUserId, setFormPicUserId] = useState(initial.picUserId);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const picUnavailable =
    picLoading || picError !== null || picOptions.length === 0;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const name = formName.trim();
    const location = formLocation.trim();

    if (name === "") {
      setFormError("Nama Proyek wajib diisi.");
      return;
    }
    if (name.length > 200) {
      setFormError("Nama Proyek maksimal 200 karakter.");
      return;
    }
    if (location === "") {
      setFormError("Lokasi Proyek wajib diisi.");
      return;
    }
    if (location.length > 200) {
      setFormError("Lokasi Proyek maksimal 200 karakter.");
      return;
    }
    const yearText = formYear.trim();
    if (yearText === "") {
      setFormError("Tahun wajib diisi.");
      return;
    }
    // Integer only: no "2026.5", no "2026abc". Number() would accept both.
    if (!/^\d{4}$/.test(yearText)) {
      setFormError("Tahun harus berupa angka 4 digit.");
      return;
    }
    const year = Number(yearText);
    if (!Number.isInteger(year) || year < 2000) {
      setFormError("Tahun minimal 2000.");
      return;
    }
    if (formPicUserId === "") {
      setFormError("Pilih PIC.");
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      const endpoint =
        mode === "create"
          ? "/api/master-project"
          : `/api/master-project/${masterProjectId}`;
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          location,
          year,
          picUserId: formPicUserId,
        }),
      });
      if (!response.ok) {
        throw new Error(await submitErrorMessage(response, mode));
      }
      router.replace("/dashboard/master-project/manage");
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : mode === "create"
            ? "Gagal menambahkan Master Project."
            : "Gagal menyimpan perubahan Master Project.",
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
          <h2 className="text-sm font-bold text-primary">
            Informasi Master Project
          </h2>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <label
              htmlFor="masterProjectName"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Nama Proyek <span className="text-red-700">*</span>
            </label>
            <input
              id="masterProjectName"
              type="text"
              required
              maxLength={200}
              value={formName}
              disabled={submitting}
              onChange={(event) => setFormName(event.target.value)}
              placeholder="cth. Proyek Gedung Kantor"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="masterProjectLocation"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Lokasi Proyek <span className="text-red-700">*</span>
            </label>
            <input
              id="masterProjectLocation"
              type="text"
              required
              maxLength={200}
              value={formLocation}
              disabled={submitting}
              onChange={(event) => setFormLocation(event.target.value)}
              placeholder="cth. Jakarta"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="masterProjectYear"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Tahun <span className="text-red-700">*</span>
            </label>
            <input
              id="masterProjectYear"
              type="number"
              required
              inputMode="numeric"
              min={2000}
              step={1}
              value={formYear}
              disabled={submitting}
              onChange={(event) => setFormYear(event.target.value)}
              placeholder="cth. 2026"
              className={inputClass}
            />
            <p className="mt-1.5 text-[11px] text-primary/50">
              Satu proyek hanya memiliki satu tahun. Tahun dipakai untuk
              pengelompokan project, termasuk MSL Engineering.
            </p>
          </div>

          <div>
            <label
              htmlFor="masterProjectPic"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              PIC <span className="text-red-700">*</span>
            </label>
            <select
              id="masterProjectPic"
              required
              value={formPicUserId}
              disabled={submitting || picUnavailable}
              onChange={(event) => setFormPicUserId(event.target.value)}
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
                Belum ada PIC Admin atau Head Office yang tersedia.
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-primary/50">
                Pilih user Admin atau Head Office yang bertanggung jawab pada
                project ini.
              </p>
            )}
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
          href="/dashboard/master-project/manage"
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
              ? "Simpan Master Project"
              : "Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}
