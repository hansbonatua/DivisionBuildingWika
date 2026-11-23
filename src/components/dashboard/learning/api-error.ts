// Client-side error reader for the Building Learning Center API.
// Keeps one consistent message shape across the grid, the admin table and the
// form dialog instead of showing raw status codes.

type LearningApiErrorBody = {
  error?: {
    message?: string;
    details?: Record<string, string[] | undefined>;
  };
};

function firstValidationDetail(
  details: Record<string, string[] | undefined> | undefined,
): string | null {
  if (!details) return null;
  for (const messages of Object.values(details)) {
    const message = messages?.find((value) => value.trim() !== "");
    if (message) return message;
  }
  return null;
}

export async function readLearningApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as LearningApiErrorBody;
    const detail = firstValidationDetail(body.error?.details);
    if (detail) return detail;
    if (body.error?.message && body.error.message.trim() !== "") {
      return body.error.message;
    }
  } catch {
    /* non-JSON error body */
  }

  if (response.status === 401) return "Sesi Anda berakhir. Silakan masuk kembali.";
  if (response.status === 403) {
    return "Anda tidak memiliki akses untuk mengubah Building Learning Center.";
  }
  if (response.status === 404) {
    return "Data tidak ditemukan. Muat ulang halaman.";
  }
  if (response.status === 409) {
    return "Data berubah di tempat lain. Muat ulang lalu coba lagi.";
  }
  if (response.status === 503) {
    return "Layanan penyimpanan file belum dikonfigurasi.";
  }
  return fallback;
}
