import type { CstCategoryId } from "@/lib/calculation-sheet-template/constants";

// Client-side mirror of the CST API contract. Deliberately declared here rather
// than imported from @/lib/calculation-sheet-template/service: the service
// imports the repository (and therefore the database client) and must never be
// bundled into a Client Component.

export type CstPicDto = {
  user_id: string;
  name: string;
  status: string;
  position: string;
};

export type CstUserRef = {
  user_id: string;
  name: string;
};

export type CstTemplateRow = {
  id: string;
  kategori: CstCategoryId;
  kode: string;
  nama: string;
  pic: CstPicDto;
  evidence_url: string | null;
  catatan: string | null;
  created_by: CstUserRef;
  created_at: string;
  updated_by: CstUserRef | null;
  updated_at: string;
};

export type CstDraft = {
  kode: string;
  nama: string;
  picUserId: string;
  evidenceUrl: string;
  catatan: string;
};

export type CstEditingState = {
  id: string;
  draft: CstDraft;
  initial: CstDraft;
  error: string | null;
};

export type CstCreatingState = {
  kategori: CstCategoryId;
  draft: CstDraft;
  error: string | null;
};

export type CstDraftField = keyof CstDraft;

export type CstDraftError = {
  field: CstDraftField;
  message: string;
};

export type CstCreatePayload = {
  kategori: CstCategoryId;
  kode: string;
  nama: string;
  pic_user_id: string;
  evidence_url: string | null;
  catatan: string | null;
};

export type CstUpdatePayload = Omit<CstCreatePayload, "kategori">;

export const CST_KODE_MAX = 30;
export const CST_NAMA_MAX = 200;
export const CST_EVIDENCE_URL_MAX = 2048;
export const CST_CATATAN_MAX = 2000;

export const EMPTY_CST_DRAFT: CstDraft = {
  kode: "",
  nama: "",
  picUserId: "",
  evidenceUrl: "",
  catatan: "",
};

export function toCstDraft(row: CstTemplateRow): CstDraft {
  return {
    kode: row.kode,
    nama: row.nama,
    picUserId: row.pic.user_id,
    evidenceUrl: row.evidence_url ?? "",
    catatan: row.catatan ?? "",
  };
}

export function draftEquals(a: CstDraft, b: CstDraft): boolean {
  return (
    a.kode === b.kode &&
    a.nama === b.nama &&
    a.picUserId === b.picUserId &&
    a.evidenceUrl === b.evidenceUrl &&
    a.catatan === b.catatan
  );
}

export function isEmptyDraft(draft: CstDraft): boolean {
  return (
    draft.kode.trim() === "" &&
    draft.nama.trim() === "" &&
    draft.picUserId === "" &&
    draft.evidenceUrl.trim() === "" &&
    draft.catatan.trim() === ""
  );
}

export function isSafeCstUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

// Pure validation mirroring @/lib/calculation-sheet-template/schema so the row
// can show its own error before any request is sent.
export function validateCstDraft(draft: CstDraft): CstDraftError | null {
  const kode = draft.kode.trim();
  if (kode.length === 0) {
    return { field: "kode", message: "Kode wajib diisi." };
  }
  if (kode.length > CST_KODE_MAX) {
    return { field: "kode", message: `Kode maksimal ${CST_KODE_MAX} karakter.` };
  }

  const nama = draft.nama.trim();
  if (nama.length === 0) {
    return { field: "nama", message: "Nama wajib diisi." };
  }
  if (nama.length > CST_NAMA_MAX) {
    return { field: "nama", message: `Nama maksimal ${CST_NAMA_MAX} karakter.` };
  }

  if (draft.picUserId.trim() === "") {
    return { field: "picUserId", message: "PIC wajib dipilih." };
  }

  const url = draft.evidenceUrl.trim();
  if (url.length > CST_EVIDENCE_URL_MAX) {
    return {
      field: "evidenceUrl",
      message: `URL evidence maksimal ${CST_EVIDENCE_URL_MAX.toLocaleString("id-ID")} karakter.`,
    };
  }
  if (url.length > 0 && !isSafeCstUrl(url)) {
    return {
      field: "evidenceUrl",
      message: "URL evidence harus diawali http:// atau https://.",
    };
  }

  if (draft.catatan.trim().length > CST_CATATAN_MAX) {
    return {
      field: "catatan",
      message: `Catatan maksimal ${CST_CATATAN_MAX.toLocaleString("id-ID")} karakter.`,
    };
  }
  return null;
}

function normalizeOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Returns null instead of a partial payload when the draft is invalid.
export function draftToCreatePayload(
  draft: CstDraft,
  kategori: CstCategoryId,
): CstCreatePayload | null {
  if (validateCstDraft(draft) !== null) {
    return null;
  }
  return {
    kategori,
    kode: draft.kode.trim().toUpperCase(),
    nama: draft.nama.trim(),
    pic_user_id: draft.picUserId,
    evidence_url: normalizeOptional(draft.evidenceUrl),
    catatan: normalizeOptional(draft.catatan),
  };
}

export function draftToUpdatePayload(draft: CstDraft): CstUpdatePayload | null {
  if (validateCstDraft(draft) !== null) {
    return null;
  }
  return {
    kode: draft.kode.trim().toUpperCase(),
    nama: draft.nama.trim(),
    pic_user_id: draft.picUserId,
    evidence_url: normalizeOptional(draft.evidenceUrl),
    catatan: normalizeOptional(draft.catatan),
  };
}

export type CstSummaryFilter = {
  kategori: CstCategoryId | "";
  picUserId: string;
  search: string;
};

// Summary filtering is client-side over the flat list: category, PIC and free
// text (kode/nama). Order comes from the API and is preserved.
export function filterCstRows(
  rows: readonly CstTemplateRow[],
  filter: CstSummaryFilter,
): CstTemplateRow[] {
  const search = filter.search.trim().toLocaleLowerCase("id-ID");
  return rows.filter((row) => {
    if (filter.kategori && row.kategori !== filter.kategori) return false;
    if (filter.picUserId && row.pic.user_id !== filter.picUserId) return false;
    if (search) {
      const haystack = `${row.kode} ${row.nama}`.toLocaleLowerCase("id-ID");
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}
