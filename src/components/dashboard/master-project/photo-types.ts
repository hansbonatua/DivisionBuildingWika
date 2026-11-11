export type MasterProjectPhoto = {
  slot: number;
  url: string;
  alt: string;
};

export type MasterProjectPhotoRow = {
  id: string;
  name: string;
  location: string;
  year?: number;
  pic?: { id?: string; name?: string } | null;
};

export type ProjectPhotosApiData = {
  project: { id: string; name: string };
  photos: MasterProjectPhoto[];
  photosComplete: boolean;
};

export async function readPhotoApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string };
    };
    if (
      typeof body.error?.message === "string" &&
      body.error.message.trim() !== ""
    ) {
      return body.error.message;
    }
  } catch {
    /* non-JSON error body */
  }
  if (response.status === 401) {
    return "Sesi Anda berakhir. Silakan masuk kembali.";
  }
  if (response.status === 403) {
    return "Anda tidak memiliki akses untuk mengelola foto proyek.";
  }
  if (response.status === 404) {
    return "Master Project tidak ditemukan.";
  }
  return fallback;
}
