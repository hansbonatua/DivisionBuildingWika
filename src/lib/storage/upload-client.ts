"use client";

// Browser-side replacement for `upload()` from `@vercel/blob/client`.
//
// Flow, in one place so every module behaves identically:
//   1. POST the ticket request to the module's token route (RBAC + pathname +
//      content type + declared size are validated there);
//   2. PUT the file straight to the presigned URL — bytes never touch the
//      Next.js server;
//   3. report progress and resolve with `{ pathname, url }`, the same pair the
//      Vercel SDK returned.
//
// Error messages keep the vocabulary the existing UI mappers look for
// ("too large", "content type", "forbidden"/401/403), so every form shows the
// same message it showed before.

export type UploadFileOptions = {
  /** Pathname the server authorized (built by the module's storage-path helper). */
  pathname: string;
  /** Declared type. Signed into the presigned PUT, so it must match the bytes. */
  contentType?: string;
  /** Module-specific authorization payload (userId, kind, projectId, …). */
  clientPayload?: Record<string, unknown>;
  /** 0–100. Called from the XHR upload progress event. */
  onProgress?: (percentage: number) => void;
};

export type UploadFileResult = {
  pathname: string;
  url: string;
};

export class UploadFileError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UploadFileError";
    this.status = status;
  }
}

const FALLBACK_CONTENT_TYPE = "application/octet-stream";

function normalizeContentType(value: string | undefined): string {
  if (typeof value !== "string") return "";
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

/**
 * Status → message. The wording is deliberate: existing callers map errors by
 * regex, so the same tokens must still appear.
 */
function statusMessage(status: number, detail: string | null): string {
  const suffix = detail && detail.trim().length > 0 ? `: ${detail.trim()}` : "";
  if (status === 401 || status === 403) {
    return `Unauthorized (${status})${suffix}`;
  }
  if (status === 413) {
    return `File too large (413)${suffix}`;
  }
  if (status === 415) {
    return `Content type not allowed (415)${suffix}`;
  }
  if (status === 409) {
    return detail?.trim() || "Objek sudah ada. Unggah ulang.";
  }
  if (status === 503) {
    return detail?.trim() || "Penyimpanan belum dikonfigurasi.";
  }
  return detail?.trim() || `Upload gagal (HTTP ${status}).`;
}

async function readServerMessage(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null) return null;
    const error = (body as { error?: unknown }).error;
    if (
      typeof error === "object" &&
      error !== null &&
      typeof (error as { message?: unknown }).message === "string"
    ) {
      return (error as { message: string }).message;
    }
    const message = (body as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  } catch {
    return null;
  }
}

function putToPresignedUrl(
  presignedUrl: string,
  file: File,
  contentType: string,
  onProgress: ((percentage: number) => void) | undefined,
): Promise<void> {
  if (typeof XMLHttpRequest === "undefined") {
    // Non-browser runtime (tests / scripts): no progress events available.
    return fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    }).then(async (response) => {
      if (response.ok) return;
      throw new UploadFileError(
        statusMessage(response.status, await readServerMessage(response)),
        response.status,
      );
    });
  }

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl, true);
    // Content-Type is part of the signature; a mismatch is rejected by S3.
    xhr.setRequestHeader("Content-Type", contentType);

    if (onProgress) {
      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (!event.lengthComputable || event.total <= 0) return;
        const percentage = Math.round((event.loaded / event.total) * 100);
        onProgress(Math.max(0, Math.min(100, percentage)));
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(new UploadFileError(statusMessage(xhr.status, null), xhr.status));
    };
    xhr.onerror = () => {
      reject(
        new UploadFileError(
          "Gagal mengunggah file. Periksa koneksi lalu coba lagi.",
          0,
        ),
      );
    };
    xhr.onabort = () => {
      reject(new UploadFileError("Unggahan dibatalkan.", 0));
    };

    xhr.send(file);
  });
}

/**
 * Uploads `file` through `tokenRoute` and resolves with the stored object.
 * Throws UploadFileError for anything the editor can act on.
 */
export async function uploadFile(
  file: File,
  tokenRoute: string,
  options: UploadFileOptions,
): Promise<UploadFileResult> {
  const contentType =
    normalizeContentType(options.contentType) ||
    normalizeContentType(file.type) ||
    FALLBACK_CONTENT_TYPE;

  const ticketResponse = await fetch(tokenRoute, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pathname: options.pathname,
      contentType,
      sizeBytes: file.size,
      clientPayload: options.clientPayload ?? null,
    }),
  });

  if (!ticketResponse.ok) {
    throw new UploadFileError(
      statusMessage(ticketResponse.status, await readServerMessage(ticketResponse)),
      ticketResponse.status,
    );
  }

  const ticket: unknown = await ticketResponse.json().catch(() => null);
  const record =
    typeof ticket === "object" && ticket !== null
      ? (ticket as {
          presignedUrl?: unknown;
          pathname?: unknown;
          url?: unknown;
          contentType?: unknown;
        })
      : null;

  if (
    !record ||
    typeof record.presignedUrl !== "string" ||
    typeof record.pathname !== "string" ||
    typeof record.url !== "string"
  ) {
    throw new UploadFileError("Respons upload tidak valid.", 500);
  }

  const signedContentType =
    typeof record.contentType === "string" && record.contentType.length > 0
      ? record.contentType
      : contentType;

  await putToPresignedUrl(
    record.presignedUrl,
    file,
    signedContentType,
    options.onProgress,
  );

  return { pathname: record.pathname, url: record.url };
}
