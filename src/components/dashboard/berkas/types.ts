export type BerkasStatus = "MENUNGGU_TTD_1" | "MENUNGGU_TTD_2" | "SELESAI";

export type BerkasDto = {
  id: string;
  judul: string;
  catatan: string | null;
  pemohon: { id: string; name: string };
  originalPdf: { name: string; sizeBytes: number };
  status: BerkasStatus;
  version: number;
  submittedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BerkasAssignmentDto = {
  berkasId: string;
  urutan: number;
  ttdUploadedAt: string | null;
};

export type BerkasUserOptionDto = {
  id: string;
  name: string;
  position: string;
};

export type BerkasListResponse = {
  data?: unknown;
  assignments?: unknown;
};

export const BERKAS_STATUS_LABELS: Record<BerkasStatus, string> = {
  MENUNGGU_TTD_1: "Menunggu TTD 1",
  MENUNGGU_TTD_2: "Menunggu TTD 2",
  SELESAI: "Selesai",
};

export function isBerkasStatus(value: unknown): value is BerkasStatus {
  return value === "MENUNGGU_TTD_1" || value === "MENUNGGU_TTD_2" || value === "SELESAI";
}

export function berkasStatusClass(status: BerkasStatus): string {
  if (status === "MENUNGGU_TTD_1") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (status === "MENUNGGU_TTD_2") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function berkasStatusNote(status: BerkasStatus): string {
  if (status === "MENUNGGU_TTD_1") {
    return "Menunggu tanda tangan Validator 1.";
  }
  if (status === "MENUNGGU_TTD_2") {
    return "Menunggu tanda tangan Validator 2.";
  }
  return "Selesai — file PDF final tersedia.";
}

export function canSignBerkas(
  status: BerkasStatus,
  assignment:
    | Pick<BerkasAssignmentDto, "urutan" | "ttdUploadedAt">
    | null
    | undefined,
): boolean {
  if (!assignment || assignment.ttdUploadedAt !== null) return false;
  if (assignment.urutan === 1) return status === "MENUNGGU_TTD_1";
  if (assignment.urutan === 2) return status === "MENUNGGU_TTD_2";
  return false;
}

export function formatBerkasDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function formatBerkasSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
