export type DisiplinCode = "A" | "B" | "C" | "D" | "E" | "F";

export type Disiplin = {
  code: DisiplinCode;
  slug: string;
  name: string;
  sortOrder: number;
};

// Enam disiplin adalah konstanta aplikasi, bukan seed database. F. Lainnya
// selalu ada walaupun belum memiliki sub-kategori.
export const DISIPLIN_LIST: Disiplin[] = [
  { code: "A", slug: "a-struktur", name: "Struktur", sortOrder: 10 },
  { code: "B", slug: "b-arsitektur", name: "Arsitektur", sortOrder: 20 },
  { code: "C", slug: "c-mep", name: "MEP", sortOrder: 30 },
  {
    code: "D",
    slug: "d-landscape-hardscape-infrastructure",
    name: "Landscape, Hardscape, Infrastructure",
    sortOrder: 40,
  },
  { code: "E", slug: "e-site-management", name: "Site Management", sortOrder: 50 },
  { code: "F", slug: "f-lainnya", name: "Lainnya", sortOrder: 60 },
];

export const DISIPLIN_CODES: readonly DisiplinCode[] = DISIPLIN_LIST.map(
  (disiplin) => disiplin.code,
);

const BY_CODE = new Map<string, Disiplin>(
  DISIPLIN_LIST.map((disiplin) => [disiplin.code, disiplin]),
);
const BY_SLUG = new Map<string, Disiplin>(
  DISIPLIN_LIST.map((disiplin) => [disiplin.slug, disiplin]),
);

export function isDisiplinCode(value: string): value is DisiplinCode {
  return BY_CODE.has(value.trim().toUpperCase());
}

export function getDisiplinByCode(code: string): Disiplin | null {
  return BY_CODE.get(code.trim().toUpperCase()) ?? null;
}

export function getDisiplinBySlug(slug: string): Disiplin | null {
  return BY_SLUG.get(slug.trim()) ?? null;
}
