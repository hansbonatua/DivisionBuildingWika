"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  TEMPLATE_FORM_ACCEPT_ATTRIBUTE,
  TEMPLATE_FORM_MAX_FILE_SIZE_BYTES,
  TEMPLATE_FORM_SOURCE_LABELS,
  isTemplateFormAllowedFileName,
  templateFormDefaultMimeType,
  type TemplateFormSourceType,
} from "@/lib/template-form/source";
import { buildTemplateFormBlobPathname } from "@/lib/template-form/storage-path";
import {
  formatTemplateFormFileSize,
  templateFormFileKind,
} from "@/lib/template-form/file-meta";
import TemplateFormFileBadge from "./TemplateFormFileBadge";

// Template & Form editor (revised V1).
//
// A record has exactly ONE source: an external link or an uploaded document.
// The source is explicit state (never inferred from an empty URL), and the
// existing uploaded metadata, a newly picked File and the link value are kept
// separate so a name/PIC-only edit can never disturb a stored document.
//
// Upload flow (Phase 3): the browser asks the WIBEX upload route for a token,
// PUTs the bytes straight to the PRIVATE store, then saves metadata through the
// normal Template & Form API. If the upload succeeds but the save fails, the
// new object is handed to the orphan-cleanup endpoint.

type TemplateFormEditorMode = "create" | "edit";

type TemplateFormInitial = {
  name: string;
  fileUrl: string;
  uploaderPicUserId: string;
  sourceType: TemplateFormSourceType;
  existingFileName: string | null;
  existingFileMimeType: string | null;
  existingFileSizeBytes: number | null;
};

type TemplateFormDetail = {
  id: string;
  name: string;
  sourceType?: string | null;
  fileUrl: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileSizeBytes?: number | null;
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

type SubmitPhase = "idle" | "uploading" | "saving";

const EMPTY_INITIAL: TemplateFormInitial = {
  name: "",
  fileUrl: "",
  uploaderPicUserId: "",
  sourceType: "link",
  existingFileName: null,
  existingFileMimeType: null,
  existingFileSizeBytes: null,
};

const UPLOAD_FAILED_MESSAGE =
  "Gagal mengunggah file. Periksa koneksi lalu coba lagi.";
const SAVE_AFTER_UPLOAD_FAILED_MESSAGE =
  "File berhasil diunggah tetapi data gagal disimpan. Silakan coba lagi.";
const INVALID_FORMAT_MESSAGE =
  "Format file tidak didukung. Gunakan PDF, Word, Excel, atau PowerPoint.";
const MAX_SIZE_MESSAGE = "Ukuran file maksimal 50 MB.";

const SOURCE_OPTIONS: readonly TemplateFormSourceType[] = ["link", "upload"];

const inputClass =
  "h-10 w-full rounded-lg border border-outline/60 bg-white px-3.5 text-xs font-semibold text-primary placeholder:text-primary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-primary/50";

const secondaryButtonClass =
  "inline-flex items-center justify-center gap-1.5 rounded border border-outline bg-surface px-3 py-1.5 text-[11px] font-bold text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60";

const downloadLinkClass =
  "inline-flex items-center gap-1.5 rounded border border-outline/50 px-2.5 py-1 text-[11px] font-bold text-secondary transition-colors hover:bg-secondary hover:text-white";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function resolvedMimeType(file: File): string {
  return (
    file.type ||
    templateFormDefaultMimeType(file.name) ||
    "application/octet-stream"
  );
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

/**
 * Removes a freshly uploaded object whose metadata save failed. Best effort by
 * design: the save error remains the message the user sees, and the backend
 * still refuses to delete anything a row references.
 */
async function cleanupOrphanUpload(pathname: string): Promise<void> {
  try {
    const response = await fetch("/api/template-form/upload/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathname }),
    });
    if (!response.ok) {
      console.warn(
        "Template & Form: orphan upload cleanup was refused",
        response.status,
      );
    }
  } catch (error) {
    console.warn("Template & Form: orphan upload cleanup failed", error);
  }
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
        const sourceType: TemplateFormSourceType =
          detail.sourceType === "upload" ? "upload" : "link";
        if (active) {
          setInitial({
            name: detail.name,
            // file_url is null for upload-sourced records.
            fileUrl: detail.fileUrl ?? "",
            uploaderPicUserId:
              detail.uploaderPic?.id ?? detail.uploaderPicUserId ?? "",
            sourceType,
            existingFileName: detail.fileName ?? null,
            existingFileMimeType: detail.fileMimeType ?? null,
            existingFileSizeBytes: detail.fileSizeBytes ?? null,
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
  const [sourceType, setSourceType] = useState<TemplateFormSourceType>(
    initial.sourceType,
  );
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filePickerOpen, setFilePickerOpen] = useState(
    initial.sourceType === "upload" && initial.existingFileName === null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [uploadPercent, setUploadPercent] = useState(0);
  const busyRef = useRef(false);

  const busy = phase !== "idle";
  const picUnavailable =
    picLoading || picError !== null || picOptions.length === 0;
  const hasExistingUpload =
    initial.sourceType === "upload" && initial.existingFileName !== null;
  const existingSizeLabel = formatTemplateFormFileSize(
    initial.existingFileSizeBytes,
  );
  const pendingSizeLabel = pendingFile
    ? formatTemplateFormFileSize(pendingFile.size)
    : null;

  function handleSourceChange(next: TemplateFormSourceType): void {
    if (busyRef.current) {
      return;
    }
    setSourceType(next);
    setFormError(null);
    if (next === "link") {
      setFilePickerOpen(false);
      return;
    }
    if (!pendingFile && (!hasExistingUpload || filePickerOpen)) {
      setFilePickerOpen(true);
    }
  }

  function handleFileSelection(file: File | null): void {
    if (!file) {
      return;
    }
    if (!isTemplateFormAllowedFileName(file.name)) {
      setFormError(INVALID_FORMAT_MESSAGE);
      return;
    }
    if (file.size <= 0 || file.size > TEMPLATE_FORM_MAX_FILE_SIZE_BYTES) {
      setFormError(MAX_SIZE_MESSAGE);
      return;
    }
    setFormError(null);
    setPendingFile(file);
    setFilePickerOpen(false);
  }

  function handleRemovePendingFile(): void {
    setPendingFile(null);
    setFormError(null);
    setFilePickerOpen(!hasExistingUpload);
  }

  function validate(): string | null {
    const name = formName.trim();
    if (name === "") {
      return "Nama Template / Form wajib diisi.";
    }
    if (name.length > 200) {
      return "Nama Template / Form maksimal 200 karakter.";
    }
    if (sourceType === "link") {
      const fileUrl = formFileUrl.trim();
      if (fileUrl === "") {
        return "Link File Template / Form wajib diisi.";
      }
      if (!isHttpUrl(fileUrl)) {
        return "Link File harus menggunakan http:// atau https://.";
      }
    } else if (!pendingFile && !hasExistingUpload) {
      return "Pilih file yang akan diunggah.";
    }
    if (formUploaderPicUserId === "") {
      return "Pilih Pengupload PIC.";
    }
    return null;
  }

  function buildPayload(blobPathname: string | null): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      name: formName.trim(),
      uploaderPicUserId: formUploaderPicUserId,
    };

    if (sourceType === "link") {
      payload.fileUrl = formFileUrl.trim();
      // Only an existing upload needs an explicit switch, so the server clears
      // the document metadata and removes the old object after the DB write.
      if (mode === "edit" && initial.sourceType === "upload") {
        payload.sourceType = "link";
      }
      return payload;
    }

    if (blobPathname && pendingFile) {
      payload.sourceType = "upload";
      payload.fileName = pendingFile.name;
      payload.fileMimeType = resolvedMimeType(pendingFile);
      payload.fileSizeBytes = pendingFile.size;
      payload.blobPathname = blobPathname;
    }
    // No new file: a name/PIC-only patch that leaves the stored document as is.
    return payload;
  }

  async function uploadPendingFile(file: File): Promise<string> {
    const pathname = buildTemplateFormBlobPathname(file.name);
    if (!pathname) {
      throw new Error("INVALID_FILE_NAME");
    }
    const blob = await upload(pathname, file, {
      access: "private",
      contentType: resolvedMimeType(file),
      handleUploadUrl: "/api/template-form/upload",
      multipart: true,
      onUploadProgress: (event) => {
        const percentage = Number(event.percentage);
        if (Number.isFinite(percentage)) {
          setUploadPercent(
            Math.max(0, Math.min(100, Math.round(percentage))),
          );
        }
      },
    });
    return blob.pathname;
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (busyRef.current) {
      return;
    }

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    busyRef.current = true;

    let uploadedPathname: string | null = null;

    if (sourceType === "upload" && pendingFile) {
      setPhase("uploading");
      setUploadPercent(0);
      try {
        uploadedPathname = await uploadPendingFile(pendingFile);
      } catch {
        busyRef.current = false;
        setPhase("idle");
        setUploadPercent(0);
        setFormError(UPLOAD_FAILED_MESSAGE);
        return;
      }
    }

    setPhase("saving");
    try {
      const endpoint =
        mode === "create"
          ? "/api/template-form"
          : `/api/template-form/${templateFormId}`;
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(uploadedPathname)),
      });

      if (!response.ok) {
        const message = await submitErrorMessage(response, mode);
        if (uploadedPathname) {
          await cleanupOrphanUpload(uploadedPathname);
          setFormError(SAVE_AFTER_UPLOAD_FAILED_MESSAGE);
        } else {
          setFormError(message);
        }
        return;
      }

      router.replace("/dashboard/template-form");
      router.refresh();
    } catch {
      if (uploadedPathname) {
        await cleanupOrphanUpload(uploadedPathname);
        setFormError(SAVE_AFTER_UPLOAD_FAILED_MESSAGE);
      } else {
        setFormError(
          mode === "create"
            ? "Gagal menambahkan Template & Form."
            : "Gagal menyimpan perubahan Template & Form.",
        );
      }
    } finally {
      busyRef.current = false;
      setPhase("idle");
      setUploadPercent(0);
    }
  }

  const submitLabel =
    phase === "uploading"
      ? "Mengunggah..."
      : phase === "saving"
        ? "Menyimpan..."
        : mode === "create"
          ? "Simpan Template / Form"
          : "Simpan Perubahan";

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
              disabled={busy}
              onChange={(event) => setFormName(event.target.value)}
              placeholder="cth. Form Pengajuan Material"
              className={inputClass}
            />
          </div>

          <fieldset disabled={busy} className="min-w-0">
            <legend className="mb-1.5 block text-xs font-semibold text-slate-700">
              Sumber <span className="text-red-700">*</span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SOURCE_OPTIONS.map((option) => {
                const checked = sourceType === option;
                return (
                  <label
                    key={option}
                    className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                      checked
                        ? "border-secondary bg-blue-50 text-primary"
                        : "border-outline/60 bg-white text-primary/70 hover:bg-background"
                    } ${busy ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                  >
                    <input
                      type="radio"
                      name="templateFormSourceType"
                      value={option}
                      checked={checked}
                      disabled={busy}
                      onChange={() => handleSourceChange(option)}
                      className="h-4 w-4 accent-secondary"
                    />
                    <span>{TEMPLATE_FORM_SOURCE_LABELS[option]}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {sourceType === "link" ? (
            <div>
              <label
                htmlFor="templateFormFileUrl"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Link File Template / Form{" "}
                <span className="text-red-700">*</span>
              </label>
              <input
                id="templateFormFileUrl"
                type="url"
                required
                maxLength={2000}
                value={formFileUrl}
                disabled={busy}
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
          ) : null}

          {hasExistingUpload ? (
            <div className="rounded-lg border border-outline/60 bg-background/60 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-primary/50">
                  File saat ini
                </p>
                {sourceType === "upload" && !pendingFile ? (
                  <button
                    type="button"
                    onClick={() => setFilePickerOpen(true)}
                    disabled={busy || filePickerOpen}
                    className={secondaryButtonClass}
                  >
                    Ganti File
                  </button>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <TemplateFormFileBadge
                  kind={templateFormFileKind(initial.existingFileName)}
                />
                <span
                  className="min-w-0 break-all text-xs font-semibold text-primary"
                  title={initial.existingFileName ?? undefined}
                >
                  {initial.existingFileName}
                </span>
                {existingSizeLabel ? (
                  <span className="text-[11px] font-medium text-primary/50">
                    {existingSizeLabel}
                  </span>
                ) : null}
              </div>
              {sourceType === "upload" && templateFormId ? (
                <a
                  href={`/api/template-form/${templateFormId}/file`}
                  className={`${downloadLinkClass} mt-2`}
                >
                  Unduh
                </a>
              ) : null}
              {sourceType === "link" ? (
                <p className="mt-2 text-[11px] font-semibold text-amber-700">
                  File saat ini akan diganti dengan link setelah disimpan.
                </p>
              ) : pendingFile ? (
                <p className="mt-2 text-[11px] font-semibold text-amber-700">
                  File saat ini akan diganti setelah perubahan disimpan.
                </p>
              ) : null}
            </div>
          ) : null}

          {pendingFile ? (
            <div className="rounded-lg border border-secondary/40 bg-blue-50/60 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-primary/50">
                File baru
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <TemplateFormFileBadge
                  kind={templateFormFileKind(pendingFile.name)}
                />
                <span
                  className="min-w-0 break-all text-xs font-semibold text-primary"
                  title={pendingFile.name}
                >
                  {pendingFile.name}
                </span>
                {pendingSizeLabel ? (
                  <span className="text-[11px] font-medium text-primary/50">
                    {pendingSizeLabel}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleRemovePendingFile}
                disabled={busy}
                className={`${secondaryButtonClass} mt-2`}
              >
                Hapus pilihan
              </button>
            </div>
          ) : null}

          {sourceType === "upload" &&
          !pendingFile &&
          (!hasExistingUpload || filePickerOpen) ? (
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (busyRef.current) {
                  return;
                }
                const dropped = event.dataTransfer.files?.[0];
                if (dropped) {
                  handleFileSelection(dropped);
                }
              }}
              className="rounded-lg border border-dashed border-outline bg-background/40 px-4 py-5 text-center"
            >
              <input
                id="templateFormFile"
                type="file"
                accept={TEMPLATE_FORM_ACCEPT_ATTRIBUTE}
                disabled={busy}
                onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  handleFileSelection(selected);
                  // Allows selecting the same file again after removing it.
                  event.target.value = "";
                }}
                aria-describedby="templateFormFileHelp"
                className="peer sr-only"
              />
              <label
                htmlFor="templateFormFile"
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-secondary peer-focus-visible:ring-offset-2 ${
                  busy
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:bg-secondary"
                }`}
              >
                Pilih File
              </label>
              <p
                id="templateFormFileHelp"
                className="mt-2 text-[11px] text-primary/50"
              >
                PDF, Word, Excel, atau PowerPoint. Maksimal 50 MB.
              </p>
            </div>
          ) : null}

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
              disabled={busy || picUnavailable}
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

      {phase === "uploading" ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-outline bg-surface px-3.5 py-3"
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-primary/70">
            <span>Mengunggah file...</span>
            <span className="tabular-nums">{uploadPercent}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Progres unggah file"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uploadPercent}
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full rounded-full bg-secondary transition-all duration-200"
              style={{ width: `${uploadPercent}%` }}
            />
          </div>
        </div>
      ) : phase === "saving" ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg border border-outline bg-surface px-3.5 py-2.5 text-xs font-semibold text-primary/70"
        >
          Menyimpan Template / Form...
        </p>
      ) : null}

      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
        >
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {busy ? (
          <span className="cursor-not-allowed rounded-lg border border-outline bg-surface px-5 py-2.5 text-xs font-bold text-primary/40">
            Batal
          </span>
        ) : (
          <Link
            href="/dashboard/template-form"
            className="rounded-lg border border-outline bg-surface px-5 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-background"
          >
            Batal
          </Link>
        )}
        <button
          type="submit"
          disabled={busy || picUnavailable}
          className="rounded-lg bg-primary px-6 py-2.5 text-xs font-bold text-white shadow transition-all hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
