"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TemplateFormEditorMode = "create" | "edit";

type TemplateFormInitial = {
  name: string;
  fileUrl: string;
  uploaderPicUserId: string;
};

type TemplateFormDetail = {
  id: string;
  name: string;
  fileUrl: string;
  uploaderPicUserId?: string;
  uploaderPic?: { id?: string; name?: string } | null;
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

const EMPTY_INITIAL: TemplateFormInitial = {
  name: "",
  fileUrl: "",
  uploaderPicUserId: "",
};

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
  mode: TemplateFormEditorMode,
): Promise<string> {
  if (response.status === 401 || response.status === 403) {
    return "Anda tidak memiliki akses untuk menyimpan Template & Form.";
  }
  if (response.status === 404) {
    return "Template & Form tidak ditemukan.";
  }
  if (response.status === 400 || response.status === 409) {
    const error = await readApiError(response);
    const detail = firstValidationDetail(error?.details);
    if (detail) {
      return detail;
    }
    if (error?.message && error.message.trim() !== "") {
      return error.message;
    }
  }
  return mode === "create"
    ? "Gagal menambahkan Template & Form."
    : "Gagal menyimpan perubahan Template & Form.";
}

export default function TemplateFormEditor({
  mode,
  templateFormId,
}: {
  mode: TemplateFormEditorMode;
  templateFormId?: string;
}) {
  const [initial, setInitial] = useState<TemplateFormInitial | null>(
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
        const response = await fetch("/api/template-form/pic-options", {
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
      setNotFound(false);
      try {
        if (!templateFormId) {
          if (active) {
            setNotFound(true);
          }
          return;
        }
        const response = await fetch(`/api/template-form/${templateFormId}`, {
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
        const body = (await response.json()) as { data?: TemplateFormDetail };
        if (!body.data) {
          throw new Error("INVALID_RESPONSE");
        }
        const detail = body.data;
        if (active) {
          setInitial({
            name: detail.name,
            fileUrl: detail.fileUrl,
            uploaderPicUserId:
              detail.uploaderPic?.id ?? detail.uploaderPicUserId ?? "",
          });
        }
      } catch {
        if (!active || controller.signal.aborted) {
          return;
        }
        setRecordError("Gagal memuat data Template & Form.");
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
  }, [mode, templateFormId, recordReloadToken]);

  if (mode === "edit" && recordLoading) {
    return (
      <div className="max-w-3xl rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-primary/70">
          Memuat data Template &amp; Form...
        </p>
      </div>
    );
  }

  if (mode === "edit" && notFound) {
    return (
      <div className="max-w-3xl rounded-lg border border-outline bg-surface p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-primary">
          Template &amp; Form tidak ditemukan.
        </p>
        <p className="mt-1 text-xs text-primary/60">
          Data dengan ID tersebut tidak tersedia.
        </p>
        <Link
          href="/dashboard/template-form"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-secondary"
        >
          Kembali ke Template &amp; Form
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
            href="/dashboard/template-form"
            className="rounded-lg border border-outline bg-surface px-5 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background"
          >
            Kembali ke Template &amp; Form
          </Link>
        </div>
      </div>
    );
  }

  if (mode === "edit" && !initial) {
    return null;
  }

  return (
    <TemplateFormFields
      key={mode === "edit" ? templateFormId : "create"}
      mode={mode}
      templateFormId={templateFormId}
      initial={initial ?? EMPTY_INITIAL}
      picOptions={picOptions}
      picLoading={picLoading}
      picError={picError}
      onRetryPic={() => setPicReloadToken((value) => value + 1)}
    />
  );
}

function TemplateFormFields({
  mode,
  templateFormId,
  initial,
  picOptions,
  picLoading,
  picError,
  onRetryPic,
}: {
  mode: TemplateFormEditorMode;
  templateFormId?: string;
  initial: TemplateFormInitial;
  picOptions: PicOption[];
  picLoading: boolean;
  picError: string | null;
  onRetryPic: () => void;
}) {
  const router = useRouter();
  const [formName, setFormName] = useState(initial.name);
  const [formFileUrl, setFormFileUrl] = useState(initial.fileUrl);
  const [formUploaderPicUserId, setFormUploaderPicUserId] = useState(
    initial.uploaderPicUserId,
  );
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
    const fileUrl = formFileUrl.trim();

    if (name === "") {
      setFormError("Nama Template / Form wajib diisi.");
      return;
    }
    if (name.length > 200) {
      setFormError("Nama Template / Form maksimal 200 karakter.");
      return;
    }
    if (fileUrl === "") {
      setFormError("Link File Template / Form wajib diisi.");
      return;
    }
    if (!isHttpUrl(fileUrl)) {
      setFormError("Link File harus menggunakan http:// atau https://.");
      return;
    }
    if (formUploaderPicUserId === "") {
      setFormError("Pilih Pengupload PIC.");
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      const endpoint =
        mode === "create"
          ? "/api/template-form"
          : `/api/template-form/${templateFormId}`;
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          fileUrl,
          uploaderPicUserId: formUploaderPicUserId,
        }),
      });
      if (!response.ok) {
        throw new Error(await submitErrorMessage(response, mode));
      }
      router.replace("/dashboard/template-form");
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : mode === "create"
            ? "Gagal menambahkan Template & Form."
            : "Gagal menyimpan perubahan Template & Form.",
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
            Informasi Template &amp; Form
          </h2>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <label
              htmlFor="templateFormName"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Nama Template / Form <span className="text-red-700">*</span>
            </label>
            <input
              id="templateFormName"
              type="text"
              required
              maxLength={200}
              value={formName}
              disabled={submitting}
              onChange={(event) => setFormName(event.target.value)}
              placeholder="cth. Form Pengajuan Material"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="templateFormFileUrl"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Link File Template / Form <span className="text-red-700">*</span>
            </label>
            <input
              id="templateFormFileUrl"
              type="url"
              required
              maxLength={2000}
              value={formFileUrl}
              disabled={submitting}
              onChange={(event) => setFormFileUrl(event.target.value)}
              placeholder="https://drive.google.com/..."
              aria-describedby="templateFormFileUrlHelp"
              className={inputClass}
            />
            <p
              id="templateFormFileUrlHelp"
              className="mt-1 text-[11px] text-primary/50"
            >
              Masukkan tautan Google Drive, SharePoint, OneDrive, atau tautan
              dokumen HTTP(S) lainnya.
            </p>
          </div>

          <div>
            <label
              htmlFor="templateFormPic"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Pengupload PIC <span className="text-red-700">*</span>
            </label>
            <select
              id="templateFormPic"
              required
              value={formUploaderPicUserId}
              disabled={submitting || picUnavailable}
              onChange={(event) =>
                setFormUploaderPicUserId(event.target.value)
              }
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
                Belum ada PIC Head Office yang tersedia.
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-primary/50">
                Pilih user Head Office yang bertanggung jawab pada dokumen ini.
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
          href="/dashboard/template-form"
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
              ? "Simpan Template/Form"
              : "Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}
